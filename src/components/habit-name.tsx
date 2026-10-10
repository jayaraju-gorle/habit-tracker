export function HabitName({ id, name }: { id: string; name: string }) {
  return (
    <label htmlFor={`habit-${id}`} className="block break-words text-base font-medium">
      {name}
    </label>
  );
}
