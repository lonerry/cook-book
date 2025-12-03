import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeCardSkeleton } from '@/components/recipes/RecipeCardSkeleton';
import { Recipe, recipesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp } from 'lucide-react';

const Popular = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likingIds, setLikingIds] = useState<Set<number>>(new Set());
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchRecipes = async () => {
      setIsLoading(true);
      try {
        const data = await recipesApi.getPopular();
        setRecipes(data);
      } catch (error) {
        console.error('Failed to fetch popular recipes:', error);
        // Demo data
        setRecipes([
          {
            id: 5,
            title: 'Том Ям с креветками',
            description: 'Острый тайский суп',
            topic: 'lunch',
            cover_image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
            ingredients: [],
            steps: [],
            author: { id: 4, email: 'thai@example.com', nickname: 'ThaiChef', created_at: '' },
            likes_count: 156,
            is_liked: true,
            created_at: new Date(Date.now() - 345600000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 6,
            title: 'Тирамису классический',
            description: 'Нежный итальянский десерт',
            topic: 'dinner',
            cover_image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800',
            ingredients: [],
            steps: [],
            author: { id: 2, email: 'italia@example.com', nickname: 'ItalianCook', created_at: '' },
            likes_count: 203,
            is_liked: false,
            created_at: new Date(Date.now() - 432000000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2,
            title: 'Паста Карбонара по-итальянски',
            description: 'Классический рецепт из Рима',
            topic: 'lunch',
            cover_image_url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
            ingredients: [],
            steps: [],
            author: { id: 2, email: 'italia@example.com', nickname: 'ItalianCook', created_at: '' },
            likes_count: 128,
            is_liked: true,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 3,
            title: 'Стейк Рибай с травяным маслом',
            description: 'Сочный стейк средней прожарки',
            topic: 'dinner',
            cover_image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800',
            ingredients: [],
            steps: [],
            author: { id: 3, email: 'grill@example.com', nickname: 'GrillMaster', created_at: '' },
            likes_count: 89,
            is_liked: false,
            created_at: new Date(Date.now() - 172800000).toISOString(),
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
            author: { id: 1, email: 'chef@example.com', nickname: 'MasterChef', created_at: '' },
            likes_count: 67,
            is_liked: false,
            created_at: new Date(Date.now() - 259200000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 1,
            title: 'Пушистые панкейки с кленовым сиропом',
            description: 'Идеальный завтрак для всей семьи',
            topic: 'breakfast',
            cover_image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
            ingredients: [],
            steps: [],
            author: { id: 1, email: 'chef@example.com', nickname: 'MasterChef', created_at: '' },
            likes_count: 42,
            is_liked: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  const handleLike = async (id: number) => {
    if (!isAuthenticated) return;
    
    setLikingIds((prev) => new Set(prev).add(id));
    try {
      const result = await recipesApi.toggleLike(id);
      setRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === id
            ? { ...recipe, likes_count: result.likes_count, is_liked: result.is_liked }
            : recipe
        )
      );
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setLikingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="gradient-hero py-12 md:py-16">
        <div className="container text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium animate-fade-up">
            <TrendingUp className="h-4 w-4" />
            Топ рецептов
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Популярные рецепты
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Самые любимые рецепты нашего сообщества
          </p>
        </div>
      </section>

      {/* Recipes Section */}
      <section className="container py-8 md:py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : (
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
        )}
      </section>
    </Layout>
  );
};

export default Popular;
