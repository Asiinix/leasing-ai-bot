import { LeasingApp } from "@/components/leasing-app";
import { decodeResume } from "@/features/proposal/resume-link";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string | string[] }>;
}) {
  const { resume } = await searchParams;
  const proposal = decodeResume(resume);
  return (
    <LeasingApp
      key={typeof resume === "string" ? resume : "calculator"}
      initialProposal={proposal}
      invalidResume={resume !== undefined && !proposal}
    />
  );
}
