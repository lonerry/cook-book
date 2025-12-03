import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeCardSkeleton } from '@/components/recipes/RecipeCardSkeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Recipe, usersApi, recipesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likingIds, setLikingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const [userData, recipesData] = await Promise.all([
          usersApi.getById(parseInt(id)),
          usersApi.getRecipes(parseInt(id)),
        ]);
        setUser(userData);
        setRecipes(recipesData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // Demo data
        setUser({
          id: parseInt(id),
          email: 'chef@example.com',
          nickname: 'MasterChef',
          avatar_url: '',
          created_at: new Date().toISOString(),
        });
        setRecipes([
          {
            id: 1,
            title: 'Пушистые панкейки с кленовым сиропом',
            description: 'Идеальный завтрак для всей семьи',
            topic: 'breakfast',
            cover_image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
            ingredients: [],
            steps: [],
            author: { id: parseInt(id), email: 'chef@example.com', nickname: 'MasterChef', created_at: '' },
            likes_count: 42,
            is_liked: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 4,
            title: 'Авокадо-тост с яйцом пашот',
            description: 'Здоровый и питательный завтрак',
            topic: 'breakfast',
            cover_image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
            ingredients: [],
            steps: [],
            author: { id: parseInt(id), email: 'chef@example.com', nickname: 'MasterChef', created_at: '' },
            likes_count: 67,
            is_liked: false,
            created_at: new Date(Date.now() - 259200000).toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleLike = async (recipeId: number) => {
    if (!isAuthenticated) return;
    
    setLikingIds((prev) => new Set(prev).add(recipeId));
    try {
      const result = await recipesApi.toggleLike(recipeId);
      setRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === recipeId
            ? { ...recipe, likes_count: result.likes_count, is_liked: result.is_liked }
            : recipe
        )
      );
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setLikingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(recipeId);
        return newSet;
      });
    }
  };

  const totalLikes = recipes.reduce((sum, recipe) => sum + recipe.likes_count, 0);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8 md:py-12 space-y-8">
          <div className="bg-card rounded-2xl shadow-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full" />
              <div className="space-y-4 flex-1">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-6">
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-24" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Пользователь не найден</h1>
          <Button asChild>
            <Link to="/">Вернуться на главную</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Profile Header */}
        <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 mb-8 animate-fade-up">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {user.nickname?.[0] || user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {user.nickname || 'Пользователь'}
              </h1>

              {/* Stats */}
              <div className="flex justify-center md:justify-start gap-6 pt-4">
                <div className="text-center">
                  <p className="font-display text-2xl font-bold text-foreground">{recipes.length}</p>
                  <p className="text-sm text-muted-foreground">Рецептов</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-2xl font-bold text-primary">{totalLikes}</p>
                  <p className="text-sm text-muted-foreground">Лайков</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Recipes */}
        <section className="space-y-6">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Рецепты пользователя
          </h2>

          {recipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe, index) => (
                <div
                  key={recipe.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <RecipeCard
                    recipe={recipe}
                    onLike={handleLike}
                    isLiking={likingIds.has(recipe.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-2xl">
              <p className="text-muted-foreground">У пользователя пока нет рецептов</p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default UserProfile;
