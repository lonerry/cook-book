import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface RecipeFiltersProps {
  selectedTopic: string;
  selectedOrder: string;
  onTopicChange: (topic: string) => void;
  onOrderChange: (order: string) => void;
}

const topics = [
  { value: '', label: 'Все' },
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
];

const orders = [
  { value: 'newest', label: 'Новые первыми' },
  { value: 'oldest', label: 'Старые первыми' },
  { value: 'popular', label: 'По популярности' },
];

export const RecipeFilters = ({
  selectedTopic,
  selectedOrder,
  onTopicChange,
  onOrderChange,
}: RecipeFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* Topic Tabs */}
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <Button
            key={topic.value}
            variant={selectedTopic === topic.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTopicChange(topic.value)}
            className={cn(
              'rounded-full',
              selectedTopic === topic.value && 'shadow-md'
            )}
          >
            {topic.label}
          </Button>
        ))}
      </div>

      {/* Sort Select */}
      <Select value={selectedOrder} onValueChange={onOrderChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Сортировка" />
        </SelectTrigger>
        <SelectContent>
          {orders.map((order) => (
            <SelectItem key={order.value} value={order.value}>
              {order.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
