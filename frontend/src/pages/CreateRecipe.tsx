import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Upload, GripVertical, Loader2, ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { recipesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const recipeSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200, 'Максимум 200 символов'),
  description: z.string().optional(),
  topic: z.enum([
    'breakfast', 
    'lunch', 
    'dinner', 
    'desserts', 
    'appetizers', 
    'salads', 
    'soups', 
    'drinks', 
    'baking', 
    'snacks', 
    'vegetarian', 
    'quick'
  ], { required_error: 'Выберите категорию' }),
  ingredients: z.array(
    z.object({
      name: z.string().min(1, 'Введите название'),
      quantity: z.string().min(1, 'Введите количество'),
    })
  ).min(1, 'Добавьте хотя бы один ингредиент'),
  steps: z.array(
    z.object({
      text: z.string().min(1, 'Введите инструкцию'),
    })
  ).min(1, 'Добавьте хотя бы один шаг'),
});

type RecipeForm = z.infer<typeof recipeSchema>;

const CreateRecipe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [stepImages, setStepImages] = useState<(File | string | null)[]>([]);
  const isEditMode = !!id;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RecipeForm>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      topic: 'lunch',
      ingredients: [{ name: '', quantity: '' }],
      steps: [{ text: '' }],
    },
  });

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({
    control,
    name: 'ingredients',
  });

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
  } = useFieldArray({
    control,
    name: 'steps',
  });

  // Load recipe data for editing
  useEffect(() => {
    if (!isEditMode || !id) return;

    const loadRecipe = async () => {
      setIsLoading(true);
      try {
        const recipe = await recipesApi.getById(parseInt(id));
        
        // Set form values
        setValue('title', recipe.title);
        setValue('description', recipe.description || '');
        setValue('topic', recipe.topic);
        
        // Set ingredients
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          setValue('ingredients', recipe.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity,
          })));
        }
        
        // Set steps
        if (recipe.steps && recipe.steps.length > 0) {
          setValue('steps', recipe.steps.map(step => ({
            text: step.text,
          })));
          // Initialize step images array with existing photo URLs or nulls
          setStepImages(recipe.steps.map(step => step.photo_path || null));
        }
        
        // Set cover preview if exists
        if (recipe.photo_path) {
          setCoverPreview(recipe.photo_path);
        }
      } catch (error) {
        console.error('Failed to load recipe:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить рецепт',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipe();
  }, [id, isEditMode, setValue, navigate, toast]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleStepImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newStepImages = [...stepImages];
      newStepImages[index] = file;
      setStepImages(newStepImages);
    }
  };

  const onSubmit = async (data: RecipeForm) => {
    if (!isAuthenticated) {
      toast({
        title: 'Требуется авторизация',
        description: 'Войдите в аккаунт, чтобы создать рецепт',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('topic', data.topic);
      formData.append('ingredients', JSON.stringify(data.ingredients.map(i => ({ name: i.name, quantity: i.quantity }))));
      
      // Steps with with_file flag
      // with_file is true if there's a new File (not a string URL from existing image)
      const stepsWithFiles = data.steps.map((step, index) => ({
        text: step.text,
        with_file: stepImages[index] instanceof File,
      }));
      formData.append('steps', JSON.stringify(stepsWithFiles));
      
      if (coverImage) {
        formData.append('photo', coverImage);
      }
      
      // Append step photos in order
      stepImages.forEach((file) => {
        if (file) {
          formData.append('step_photos', file);
        }
      });

      if (isEditMode && id) {
        const recipe = await recipesApi.update(parseInt(id), formData);
        toast({ title: 'Рецепт обновлен!' });
        navigate(`/recipes/${recipe.id}`);
      } else {
        const recipe = await recipesApi.create(formData);
        toast({ title: 'Рецепт создан!' });
        navigate(`/recipes/${recipe.id}`);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: isEditMode ? 'Не удалось обновить рецепт' : 'Не удалось создать рецепт',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-sans text-3xl font-bold text-foreground">
            {isEditMode ? 'Редактировать рецепт' : 'Новый рецепт'}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Cover Image */}
          <div className="space-y-4">
            <Label>Обложка рецепта</Label>
            <div
              className="relative aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden bg-muted/30"
              onClick={() => document.getElementById('cover-input')?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Upload className="h-10 w-10" />
                  <span>Нажмите для загрузки фото</span>
                </div>
              )}
              <input
                id="cover-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Название *</Label>
            <Input
              id="title"
              placeholder="Например: Пушистые панкейки с кленовым сиропом"
              {...register('title')}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              placeholder="Краткое описание рецепта..."
              {...register('description')}
              className="min-h-[100px]"
            />
          </div>

          {/* Topic */}
          <div className="space-y-4">
            <Label>Категория *</Label>
            <Controller
              name="topic"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="breakfast" id="breakfast" />
                    <Label htmlFor="breakfast" className="cursor-pointer">Завтрак</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lunch" id="lunch" />
                    <Label htmlFor="lunch" className="cursor-pointer">Обед</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dinner" id="dinner" />
                    <Label htmlFor="dinner" className="cursor-pointer">Ужин</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="desserts" id="desserts" />
                    <Label htmlFor="desserts" className="cursor-pointer">Десерты</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="appetizers" id="appetizers" />
                    <Label htmlFor="appetizers" className="cursor-pointer">Закуски</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="salads" id="salads" />
                    <Label htmlFor="salads" className="cursor-pointer">Салаты</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="soups" id="soups" />
                    <Label htmlFor="soups" className="cursor-pointer">Супы</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="drinks" id="drinks" />
                    <Label htmlFor="drinks" className="cursor-pointer">Напитки</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="baking" id="baking" />
                    <Label htmlFor="baking" className="cursor-pointer">Выпечка</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="snacks" id="snacks" />
                    <Label htmlFor="snacks" className="cursor-pointer">Перекусы</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vegetarian" id="vegetarian" />
                    <Label htmlFor="vegetarian" className="cursor-pointer">Вегетарианские</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="quick" id="quick" />
                    <Label htmlFor="quick" className="cursor-pointer">Быстрые</Label>
                  </div>
                </RadioGroup>
              )}
            />
            {errors.topic && <p className="text-sm text-destructive">{errors.topic.message}</p>}
          </div>

          {/* Ingredients */}
          <div className="space-y-4">
            <Label>Ингредиенты *</Label>
            <div className="space-y-3">
              {ingredientFields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-start animate-fade-in">
                  <div className="flex-1">
                    <Input
                      placeholder="Название"
                      {...register(`ingredients.${index}.name`)}
                      className={errors.ingredients?.[index]?.name ? 'border-destructive' : ''}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      placeholder="Кол-во"
                      {...register(`ingredients.${index}.quantity`)}
                      className={errors.ingredients?.[index]?.quantity ? 'border-destructive' : ''}
                    />
                  </div>
                  {ingredientFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendIngredient({ name: '', quantity: '' })}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить ингредиент
            </Button>
            {errors.ingredients?.message && (
              <p className="text-sm text-destructive">{errors.ingredients.message}</p>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <Label>Шаги приготовления *</Label>
            <div className="space-y-4">
              {stepFields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 bg-muted/30 rounded-xl space-y-4 animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-medium text-foreground">Шаг {index + 1}</span>
                    <div className="flex-1" />
                    {stepFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeStep(index);
                          const newImages = [...stepImages];
                          newImages.splice(index, 1);
                          setStepImages(newImages);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Textarea
                    placeholder="Опишите этот шаг..."
                    {...register(`steps.${index}.text`)}
                    className={errors.steps?.[index]?.text ? 'border-destructive' : ''}
                  />

                  {/* Step Image */}
                  <div>
                    <input
                      id={`step-image-${index}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleStepImageChange(index, e)}
                    />
                    {stepImages[index] ? (
                      <div className="relative">
                        <img
                          src={stepImages[index] instanceof File 
                            ? URL.createObjectURL(stepImages[index] as File)
                            : stepImages[index] as string}
                          alt={`Step ${index + 1}`}
                          className="max-h-48 rounded-lg object-cover"
                          onError={(e) => {
                            // Hide image if it fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            const newImages = [...stepImages];
                            newImages[index] = null;
                            setStepImages(newImages);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`step-image-${index}`)?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Добавить фото (опционально)
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                appendStep({ text: '' });
                setStepImages([...stepImages, null]);
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить шаг
            </Button>
            {errors.steps?.message && (
              <p className="text-sm text-destructive">{errors.steps.message}</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Сохранение...
                </>
              ) : (
                isEditMode ? 'Сохранить изменения' : 'Опубликовать рецепт'
              )}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)}>
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateRecipe;
