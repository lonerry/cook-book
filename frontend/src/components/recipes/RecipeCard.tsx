import { Link } from 'react-router-dom';
import { Heart, Clock, User } from 'lucide-react';
import { Recipe } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, normalizeImageUrl } from '@/lib/utils';

interface RecipeCardProps {
  recipe: Recipe;
  onLike?: (id: number) => void;
  isLiking?: boolean;
}

const topicLabels: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  desserts: 'Десерты',
  appetizers: 'Закуски',
  salads: 'Салаты',
  soups: 'Супы',
  drinks: 'Напитки',
  baking: 'Выпечка',
  snacks: 'Перекусы',
  vegetarian: 'Вегетарианские',
  quick: 'Быстрые',
};

const topicColors: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-700 border-amber-200',
  lunch: 'bg-orange-100 text-orange-700 border-orange-200',
  dinner: 'bg-amber-100 text-amber-800 border-amber-300',
  desserts: 'bg-pink-100 text-pink-700 border-pink-200',
  appetizers: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  salads: 'bg-green-100 text-green-700 border-green-200',
  soups: 'bg-blue-100 text-blue-700 border-blue-200',
  drinks: 'bg-purple-100 text-purple-700 border-purple-200',
  baking: 'bg-rose-100 text-rose-700 border-rose-200',
  snacks: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  vegetarian: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  quick: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

export const RecipeCard = ({ recipe, onLike, isLiking }: RecipeCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onLike) {
      onLike(recipe.id);
    }
  };

  return (
    <article className="group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
      <Link to={`/recipes/${recipe.id}`} className="flex flex-col h-full">
        {/* Image */}
        <div className="aspect-[4/3] overflow-hidden bg-muted relative flex-shrink-0">
          {(() => {
            const imageUrl = normalizeImageUrl(recipe.photo_path);
            return imageUrl ? (
              <img
                src={imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  // Если изображение не загрузилось, скрываем его и показываем placeholder
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const placeholder = target.parentElement?.querySelector('.recipe-placeholder') as HTMLElement;
                  if (placeholder) {
                    placeholder.style.display = 'flex';
                  }
                }}
              />
            ) : null;
          })()}
          <div 
            className="recipe-placeholder absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5"
            style={{ display: normalizeImageUrl(recipe.photo_path) ? 'none' : 'flex' }}
          >
            <span className="text-6xl">🍽️</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 flex flex-col flex-1">
          {/* Category & Date */}
          <div className="flex items-center justify-between gap-2 flex-shrink-0">
            <Badge variant="outline" className={cn('text-xs', topicColors[recipe.topic])}>
              {topicLabels[recipe.topic]}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(recipe.created_at)}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-sans text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors flex-shrink-0 min-h-[3.5rem]">
            {recipe.title}
          </h3>

          {/* Author */}
          <div className="mt-auto flex-shrink-0">
            {recipe.author ? (
              <Link
                to={`/users/${recipe.author.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={recipe.author.photo_path} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {recipe.author.nickname?.[0] || recipe.author.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate">
                  {recipe.author.nickname || recipe.author.email}
                </span>
              </Link>
            ) : recipe.author_id ? (
              <Link
                to={`/users/${recipe.author_id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate">
                  Автор
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Like Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLikeClick}
        disabled={isLiking}
        className={cn(
          'absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm z-20',
          recipe.liked_by_me && 'text-primary'
        )}
      >
        <Heart className={cn('h-4 w-4 transition-all', recipe.liked_by_me && 'fill-primary animate-heart')} />
      </Button>
    </article>
  );
};
