import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Clock, Edit, Trash2, Loader2, Send } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Recipe, Comment, recipesApi, commentsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const topicLabels: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
};

const topicColors: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-700 border-amber-200',
  lunch: 'bg-orange-100 text-orange-700 border-orange-200',
  dinner: 'bg-amber-100 text-amber-800 border-amber-300',
};

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiking, setIsLiking] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const [recipeData, commentsData] = await Promise.all([
          recipesApi.getById(parseInt(id)),
          commentsApi.getByRecipe(parseInt(id)),
        ]);
        setRecipe(recipeData);
        setComments(commentsData);
      } catch (error) {
        console.error('Failed to fetch recipe:', error);
        // Demo data
        setRecipe({
          id: 1,
          title: 'Пушистые панкейки с кленовым сиропом',
          description: 'Идеальные пушистые панкейки для завтрака всей семьей. Подавайте с кленовым сиропом, свежими ягодами и взбитыми сливками.',
          topic: 'breakfast',
          photo_path: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200',
          ingredients: [
            { name: 'Мука', quantity: '200 г' },
            { name: 'Молоко', quantity: '250 мл' },
            { name: 'Яйцо', quantity: '2 шт' },
            { name: 'Сахар', quantity: '2 ст.л.' },
            { name: 'Разрыхлитель', quantity: '1 ч.л.' },
            { name: 'Соль', quantity: 'щепотка' },
            { name: 'Сливочное масло', quantity: '30 г' },
          ],
          steps: [
            { order_index: 1, text: 'Смешайте муку, сахар, разрыхлитель и соль в большой миске.', photo_path: 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=800' },
            { order_index: 2, text: 'В отдельной миске взбейте яйца с молоком и растопленным сливочным маслом.' },
            { order_index: 3, text: 'Влейте жидкие ингредиенты в сухие и аккуратно перемешайте до однородности. Не переусердствуйте!' },
            { order_index: 4, text: 'Разогрейте сковороду на среднем огне и слегка смажьте маслом.' },
            { order_index: 5, text: 'Выливайте тесто по 1/4 чашки на сковороду. Жарьте до появления пузырьков, затем переверните.', photo_path: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800' },
            { order_index: 6, text: 'Подавайте горячими с кленовым сиропом и свежими ягодами.' },
          ],
          author: { id: 1, email: 'chef@example.com', nickname: 'MasterChef' },
          likes_count: 42,
          liked_by_me: false,
          created_at: new Date().toISOString(),
        });
        setComments([
          {
            id: 1,
            content: 'Отличный рецепт! Получились очень вкусные и пушистые.',
            author: { id: 2, email: 'user@example.com', nickname: 'FoodLover' },
            can_edit: true,
            can_delete: true,
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 2,
            content: 'Добавила немного ванили - стало еще вкуснее!',
            author: { id: 3, email: 'cook@example.com', nickname: 'HomeCook' },
            can_edit: true,
            can_delete: true,
            created_at: new Date(Date.now() - 43200000).toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleLike = async () => {
    if (!recipe || !isAuthenticated) return;
    
    setIsLiking(true);
    try {
      const result = await recipesApi.toggleLike(recipe.id);
      setRecipe({
        ...recipe,
        likes_count: result.likes_count,
        liked_by_me: result.liked,
      });
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!recipe) return;
    
    try {
      await recipesApi.delete(recipe.id);
      toast({ title: 'Рецепт удален' });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить рецепт',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe || !newComment.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      const comment = await commentsApi.create(recipe.id, newComment.trim());
      setComments([...comments, comment]);
      setNewComment('');
      toast({ title: 'Комментарий добавлен' });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить комментарий',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!recipe || !editingCommentText.trim()) return;
    
    try {
      const updated = await commentsApi.update(recipe.id, commentId, editingCommentText.trim());
      setComments(comments.map((c) => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditingCommentText('');
      toast({ title: 'Комментарий обновлен' });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить комментарий',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!recipe) return;
    
    try {
      await commentsApi.delete(recipe.id, commentId);
      setComments(comments.filter((c) => c.id !== commentId));
      toast({ title: 'Комментарий удален' });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить комментарий',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isAuthor = user && recipe && user.id === recipe.author_id;
  const canEditComment = (comment: Comment) => comment.can_edit;
  const canDeleteComment = (comment: Comment) => comment.can_delete;

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8 space-y-8">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <Skeleton className="h-10 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!recipe) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Рецепт не найден</h1>
          <Button asChild>
            <Link to="/">Вернуться на главную</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <article className="pb-16">
        {/* Hero Image */}
        <div className="relative h-[40vh] md:h-[50vh] bg-muted overflow-hidden">
          {recipe.photo_path ? (
            <img
              src={recipe.photo_path}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Если фото не загрузилось, показываем fallback
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.parentElement?.querySelector('.image-fallback') as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className={`image-fallback w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 ${recipe.photo_path ? 'hidden' : ''}`}
          >
            <span className="text-9xl">🍽️</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          
          {/* Back Button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 left-4 rounded-full shadow-lg"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
          <div className="bg-card rounded-2xl shadow-card-hover p-6 md:p-8 space-y-8 animate-slide-up">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={cn('text-sm', topicColors[recipe.topic])}>
                  {topicLabels[recipe.topic]}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDate(recipe.created_at)}
                </span>
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                {recipe.title}
              </h1>

              {recipe.description && (
                <p className="text-lg text-muted-foreground">{recipe.description}</p>
              )}

              {/* Author & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                <Link
                  to={`/users/${recipe.author_id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={recipe.author?.photo_path} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {recipe.author?.nickname?.[0] || recipe.author?.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {recipe.author?.nickname || recipe.author?.email}
                    </p>
                    <p className="text-sm text-muted-foreground">Автор рецепта</p>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <Button
                    variant={recipe.liked_by_me ? 'default' : 'outline'}
                    size="lg"
                    onClick={handleLike}
                    disabled={isLiking || !isAuthenticated}
                    className="gap-2"
                  >
                    <Heart className={cn('h-5 w-5', recipe.liked_by_me && 'fill-current')} />
                    {recipe.likes_count}
                  </Button>

                  {isAuthor && (
                    <>
                      <Button variant="outline" size="icon" asChild>
                        <Link to={`/recipes/${recipe.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-md bg-card border-2">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">Удалить рецепт?</AlertDialogTitle>
                            <AlertDialogDescription className="text-base pt-2">
                              Это действие нельзя отменить. Рецепт будет удален навсегда.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row gap-3 sm:gap-3 sm:flex-row sm:justify-end">
                            <AlertDialogCancel className="m-0 flex-1 sm:flex-initial">Отмена</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDeleteRecipe} 
                              className="m-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive flex-1 sm:flex-initial"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <section className="space-y-4">
              <h2 className="font-display text-2xl font-semibold text-foreground">Ингредиенты</h2>
              <div className="bg-secondary/50 rounded-xl p-6">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-foreground">{ingredient.name}</span>
                      <span className="text-muted-foreground font-medium">{ingredient.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Steps */}
            <section className="space-y-6">
              <h2 className="font-display text-2xl font-semibold text-foreground">Приготовление</h2>
              <div className="space-y-6">
                {recipe.steps?.map((step) => (
                  <div key={step.order_index} className="flex gap-4 animate-fade-up" style={{ animationDelay: `${step.order_index * 0.1}s` }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                      {step.order_index}
                    </div>
                    <div className="flex-1 space-y-4">
                      <p className="text-foreground leading-relaxed">{step.text}</p>
                      {step.photo_path && (
                        <img
                          src={step.photo_path}
                          alt={`Шаг ${step.order_index}`}
                          className="rounded-lg max-w-md w-full object-cover"
                          onError={(e) => {
                            // Скрываем фото, если оно не загрузилось
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Comments */}
            <section className="space-y-6 pt-8 border-t border-border">
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Комментарии ({comments.length})
              </h2>

              {/* Comment Form */}
              {isAuthenticated ? (
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <Textarea
                    placeholder="Поделитесь своим мнением о рецепте..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button type="submit" disabled={isSubmittingComment || !newComment.trim()}>
                    {isSubmittingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Отправить
                  </Button>
                </form>
              ) : (
                <p className="text-muted-foreground">
                  <Link to="/login" className="text-primary hover:underline">
                    Войдите
                  </Link>
                  , чтобы оставить комментарий
                </p>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/users/${comment.author.id}`}
                        className="flex items-center gap-2 hover:opacity-80"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.author.photo_path} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {comment.author.nickname?.[0] || comment.author.email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-foreground text-sm">
                            {comment.author.nickname || comment.author.email}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                      </Link>

                      {(canEditComment(comment) || canDeleteComment(comment)) && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentText(comment.content);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                            Сохранить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentText('');
                            }}
                          >
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-foreground">{comment.content}</p>
                    )}
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Пока нет комментариев. Будьте первым!
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default RecipeDetail;
