import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/lib/prisma";
import type { OrganizationsResponse } from "../../types/organization";
import { CACHE_REVALIDATE_SECONDS } from "./constants";

export const loadOrganizations = unstable_cache(
  async (): Promise<OrganizationsResponse> => {
    // 全ての有効な組織データを取得
    const organizations = await prisma.politicalOrganization.findMany({
      select: {
        slug: true,
        orgName: true,
        displayName: true,
      },
      orderBy: { id: "asc" },
    });

    if (organizations.length === 0) {
      throw new Error("No political organizations found");
    }

    return {
      default: organizations[0].slug,
      organizations: organizations.map((org) => ({
        slug: org.slug,
        orgName: org.orgName,
        displayName: org.displayName,
      })),
    };
  },
  ["organizations"],
  {
    revalidate: CACHE_REVALIDATE_SECONDS,
  },
);
