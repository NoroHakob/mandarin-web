import { IoArrowUp } from "react-icons/io5";

type StatItemProps = {
  value: string | number;
  label: string;
  /** Weekly change shown as a green "↑ N"; omitted when undefined. */
  change?: number;
};

/** A headline number with an optional weekly change and a small label underneath. */
export default function StatItem({ value, label, change }: StatItemProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-bold text-text">{value}</span>
        {change !== undefined && (
          <>
            <IoArrowUp size={14} color="#34C759" className="ml-0.5 self-center" aria-hidden />
            <span className="text-sm font-bold text-success">{change}</span>
          </>
        )}
      </div>
      <span className="-mt-0.5 text-[11px] font-semibold text-subdued">{label}</span>
    </div>
  );
}
