import { prisma } from "../src/lib/prisma.js";
import { applyEarnedReferralRewards } from "../src/services/referralService.js";

async function main() {
  const inviters = await prisma.referralReward.findMany({
    where: { status: "earned" },
    select: { inviterId: true },
    distinct: ["inviterId"],
  });

  for (const inviter of inviters) {
    try {
      await applyEarnedReferralRewards(inviter.inviterId);
    } catch (err) {
      console.error(`Failed to apply rewards for inviter ${inviter.inviterId}:`, err);
    }
  }
}

main()
  .then(() => {
    console.log("✅ Referral rewards processing complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Referral rewards processing failed:", err);
    process.exit(1);
  });
