import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { RecipeCardSkeleton } from '@/components/recipes/RecipeCardSkeleton';
import { RecipeFilters } from '@/components/recipes/RecipeFilters';
import { Recipe, recipesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { UtensilsCrossed, Search } from 'lucide-react';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [likingIds, setLikingIds] = useState<Set<number>>(new Set());
  const { isAuthenticated } = useAuth();

  const searchQuery = searchParams.get('q') || '';
  const selectedTopic = searchParams.get('topic') || '';
  const selectedOrder = searchParams.get('order') || 'newest';

  useEffect(() => {
    const fetchRecipes = async () => {
      // Показываем загрузку только при первой загрузке
      if (isInitialLoad) {
        setIsLoading(true);
      }
      
      try {
        const data = await recipesApi.getAll({
          topic: selectedTopic || undefined,
          order: selectedOrder === 'newest' ? 'desc' : selectedOrder === 'oldest' ? 'asc' : undefined,
          q: searchQuery || undefined,
        });
        setRecipes(data);
      } catch (error) {
        console.error('Failed to fetch recipes:', error);
        // При ошибке просто оставляем пустой список при первой загрузке
        if (isInitialLoad) {
          setRecipes([]);
        }
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    };

    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic, selectedOrder, searchQuery]);

  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    setSearchParams(params);
  };

  const handleTopicChange = (topic: string) => {
    const params = new URLSearchParams(searchParams);
    if (topic) {
      params.set('topic', topic);
    } else {
      params.delete('topic');
    }
    setSearchParams(params);
  };

  const handleOrderChange = (order: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('order', order);
    setSearchParams(params);
  };

  const handleLike = async (id: number) => {
    if (!isAuthenticated) return;
    
    setLikingIds((prev) => new Set(prev).add(id));
    try {
      const result = await recipesApi.toggleLike(id);
      setRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === id
            ? { ...recipe, likes_count: result.likes_count, liked_by_me: result.liked }
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

  const filteredRecipes = recipes.filter((recipe) => {
    if (selectedTopic && recipe.topic !== selectedTopic) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <Layout onSearch={handleSearch} searchQuery={searchQuery}>
      {/* Hero Section */}
      <section className="gradient-hero py-12 md:py-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-bold text-foreground animate-fade-up">
            Откройте мир <span className="text-primary">вкусных</span> рецептов
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Находите вдохновение, готовьте с удовольствием и делитесь своими кулинарными шедеврами
          </p>
        </div>
      </section>

      {/* Recipes Section */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Search indicator */}
        {searchQuery && (
          <div className="mb-6 flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Результаты поиска: "{searchQuery}"</span>
            <span className="text-foreground font-medium">({filteredRecipes.length})</span>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8">
          <RecipeFilters
            selectedTopic={selectedTopic}
            selectedOrder={selectedOrder}
            onTopicChange={handleTopicChange}
            onOrderChange={handleOrderChange}
          />
        </div>

        {/* Recipes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe, index) => (
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
          <div className="text-center py-16 space-y-4">
            <UtensilsCrossed className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <h3 className="font-sans text-xl font-semibold text-foreground">
              Рецепты не найдены
            </h3>
            <p className="text-muted-foreground">
              Попробуйте изменить параметры поиска или фильтры
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Index;
