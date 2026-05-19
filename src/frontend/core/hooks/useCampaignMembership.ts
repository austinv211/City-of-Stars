import { useCampaign } from "@/core/context/CampaignContext";

export function useCampaignMembership() {
  const { campaign, membership, isDM } = useCampaign();
  return { campaign, membership, isDM };
}
