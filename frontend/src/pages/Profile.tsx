import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Edit, Plus, Loader2, LogOut, Key, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeCardSkeleton } from '@/components/recipes/RecipeCardSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Recipe, authApi, usersApi, recipesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Profile = () => {
  const { user, logout, updateUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteRecipeId, setDeleteRecipeId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [likingRecipeId, setLikingRecipeId] = useState<number | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchRecipes = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Получаем данные пользователя, которые включают рецепты
        const userData = await authApi.getCurrentUser();
        if (userData.recipes) {
          // Добавляем author_id и author к рецептам, если их нет
          const recipesWithAuthor = userData.recipes.map((recipe: any) => ({
            ...recipe,
            author_id: recipe.author_id || user.id,
            author: recipe.author || {
              id: user.id,
              email: user.email,
              nickname: user.nickname,
              photo_path: user.photo_path,
            },
            created_at: recipe.created_at || new Date().toISOString(),
          }));
          setRecipes(recipesWithAuthor);
        } else {
          setRecipes([]);
        }
      } catch (error) {
        console.error('Failed to fetch recipes:', error);
        // Demo data
        setRecipes([
          {
            id: 1,
            author_id: user.id,
            title: 'Мой любимый рецепт панкейков',
            description: 'Быстрый и вкусный завтрак',
            topic: 'breakfast',
            photo_path: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
            ingredients: [],
            steps: [],
            author: { id: user.id, email: user.email, nickname: user.nickname, photo_path: user.photo_path },
            likes_count: 42,
            liked_by_me: false,
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            author_id: user.id,
            title: 'Домашняя паста',
            description: 'Рецепт из Италии',
            topic: 'lunch',
            photo_path: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
            ingredients: [],
            steps: [],
            author: { id: user.id, email: user.email, nickname: user.nickname, photo_path: user.photo_path },
            likes_count: 28,
            liked_by_me: true,
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 3,
            author_id: user.id,
            title: 'Куриный суп с лапшой',
            description: 'Традиционный домашний рецепт',
            topic: 'dinner',
            photo_path: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
            ingredients: [],
            steps: [],
            author: { id: user.id, email: user.email, nickname: user.nickname, photo_path: user.photo_path },
            likes_count: 35,
            liked_by_me: false,
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipes();
  }, [user, isAuthenticated, navigate]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updatedUser = await usersApi.updateProfile({ nickname });
      updateUser(updatedUser);
      setIsEditingProfile(false);
      toast({ title: 'Профиль обновлен' });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить профиль',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Ошибка',
        description: 'Пароли не совпадают',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Ошибка',
        description: 'Пароль должен содержать минимум 6 символов',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Пароль успешно изменен' });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить пароль. Проверьте текущий пароль.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!deleteRecipeId) return;
    
    setIsDeleting(true);
    try {
      await recipesApi.delete(deleteRecipeId);
      setRecipes((prev) => prev.filter((r) => r.id !== deleteRecipeId));
      toast({ title: 'Рецепт удален' });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить рецепт',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteRecipeId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLike = async (recipeId: number) => {
    setLikingRecipeId(recipeId);
    try {
      const response = await recipesApi.toggleLike(recipeId);
      // Обновляем состояние рецепта
      setRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === recipeId
            ? {
                ...recipe,
                liked_by_me: response.liked,
                likes_count: response.likes_count,
              }
            : recipe
        )
      );
    } catch (error) {
      console.error('Failed to toggle like:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось поставить лайк',
        variant: 'destructive',
      });
    } finally {
      setLikingRecipeId(null);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await usersApi.uploadAvatar(file);
      // Обновляем пользователя с новым photo_path
      const updatedUser = await authApi.getCurrentUser();
      updateUser(updatedUser);
      toast({ title: 'Аватар обновлен' });
      // Сброс input для возможности повторной загрузки того же файла
      e.target.value = '';
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить аватар',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  const totalLikes = recipes.reduce((sum, recipe) => sum + recipe.likes_count, 0);

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Profile Header */}
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 mb-8 animate-fade-up">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-24 w-24 md:h-32 md:w-32">
                <AvatarImage src={user.photo_path} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {user.nickname?.[0] || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full shadow-md h-8 w-8 cursor-pointer"
                  asChild
                >
                  <span>
                    <Camera className="h-4 w-4" />
                  </span>
                </Button>
              </label>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <h1 className="font-sans text-2xl md:text-3xl font-bold text-foreground">
                {user.nickname || 'Пользователь'}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>

              {/* Stats */}
              <div className="flex justify-center md:justify-start gap-6 pt-4">
                <div className="text-center">
                  <p className="font-sans text-2xl font-bold text-foreground">{recipes.length}</p>
                  <p className="text-sm text-muted-foreground">Рецептов</p>
                </div>
                <div className="text-center">
                  <p className="font-sans text-2xl font-bold text-primary">{totalLikes}</p>
                  <p className="text-sm text-muted-foreground">Лайков</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Редактировать
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Редактировать профиль</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nickname">Никнейм</Label>
                      <Input
                        id="nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Введите никнейм"
                      />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Сохранить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Key className="h-4 w-4" />
                    Изменить пароль
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Изменить пароль</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Текущий пароль</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Введите текущий пароль"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Новый пароль</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Введите новый пароль"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторите новый пароль"
                      />
                    </div>
                    <Button onClick={handleChangePassword} disabled={isSaving} className="w-full">
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Изменить пароль
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="ghost" className="gap-2 text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Выйти
              </Button>
            </div>
          </div>
        </div>

        {/* My Recipes */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-2xl font-semibold text-foreground">Мои рецепты</h2>
            <Button asChild>
              <Link to="/recipes/new">
                <Plus className="h-4 w-4 mr-2" />
                Новый рецепт
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe, index) => (
                <div
                  key={recipe.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="relative group">
                    <RecipeCard recipe={recipe} onLike={handleLike} isLiking={likingRecipeId === recipe.id} />
                    {/* Edit/Delete overlay */}
                    <div className="absolute top-3 right-14 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 shadow-md bg-background/90 backdrop-blur-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/recipes/${recipe.id}/edit`);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8 shadow-md bg-destructive/90 backdrop-blur-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteRecipeId(recipe.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-2xl">
              <p className="text-muted-foreground mb-4">У вас пока нет рецептов</p>
              <Button asChild>
                <Link to="/recipes/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать первый рецепт
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Delete Recipe Confirmation */}
      <AlertDialog open={!!deleteRecipeId} onOpenChange={() => setDeleteRecipeId(null)}>
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
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Profile;
