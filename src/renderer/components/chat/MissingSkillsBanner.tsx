interface MissingSkillsBannerProps {
  missingSkills: string[];
}

export function MissingSkillsBanner({ missingSkills }: MissingSkillsBannerProps) {
  if (missingSkills.length === 0) return null;

  return (
    <div className="flex items-center gap-2 self-start rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-100 shadow-sm">
      Missing skills: {missingSkills.join(', ')}
    </div>
  );
}
