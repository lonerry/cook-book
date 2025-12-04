import { Link } from 'react-router-dom';
import { ChefHat, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-sans text-xl font-bold text-foreground">
              <ChefHat className="h-6 w-6 text-primary" />
              CookBook
            </Link>
            <p className="text-muted-foreground text-sm">
              Делитесь своими любимыми рецептами и открывайте новые кулинарные шедевры вместе с нами.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Быстрые ссылки</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Главная
              </Link>
              <Link to="/popular" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Популярные рецепты
              </Link>
              <Link to="/recipes/new" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Добавить рецепт
              </Link>
            </nav>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Категории</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/?topic=breakfast" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Завтраки
              </Link>
              <Link to="/?topic=lunch" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Обеды
              </Link>
              <Link to="/?topic=dinner" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Ужины
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2024 CookBook. Все права защищены.</p>
          <p className="flex items-center gap-1">
            Сделано с <Heart className="h-4 w-4 text-primary fill-primary" /> для любителей готовить
          </p>
        </div>
      </div>
    </footer>
  );
};
