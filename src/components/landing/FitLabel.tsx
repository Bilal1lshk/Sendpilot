interface FitLabelProps {
  fit: "Strong fit" | "Possible fit" | "Needs a look";
}

export function FitLabel({ fit }: FitLabelProps) {
  const config = {
    "Strong fit": {
      dot: "bg-[#1F7A52]",
      text: "text-[#1F7A52] dark:text-[#52C58F]",
      border: "border-[#D7EBE0] dark:border-[#1F4532]",
      bg: "bg-[#F0F8F3] dark:bg-[#142B20]",
    },
    "Possible fit": {
      dot: "bg-[#C28514]",
      text: "text-[#8F600A] dark:text-[#E8BA60]",
      border: "border-[#F3E5CA] dark:border-[#423315]",
      bg: "bg-[#FAF5EC] dark:bg-[#282114]",
    },
    "Needs a look": {
      dot: "bg-[#7E8488]",
      text: "text-[#52575B] dark:text-[#A7ACB0]",
      border: "border-[#E4E5E6] dark:border-[#33373A]",
      bg: "bg-[#F3F4F4] dark:bg-[#1E2224]",
    },
  }[fit];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.border} ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span>{fit}</span>
    </span>
  );
}
