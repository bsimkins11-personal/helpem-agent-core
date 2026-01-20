import { useEffect, useState } from "react";

export type ConnectionQuality = {
  effectiveType: string | null;
  downlinkMbps: number | null;
  rttMs: number | null;
  saveData: boolean;
  isSlow: boolean;
  isCellular: boolean;
  updatedAt: number;
};

const getConnectionInfo = (): ConnectionQuality => {
  if (typeof navigator === "undefined") {
    return {
      effectiveType: null,
      downlinkMbps: null,
      rttMs: null,
      saveData: false,
      isSlow: false,
      isCellular: false,
      updatedAt: Date.now(),
    };
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const effectiveType = typeof connection?.effectiveType === "string" ? connection.effectiveType : null;
  const downlink = typeof connection?.downlink === "number" ? connection.downlink : null;
  const rtt = typeof connection?.rtt === "number" ? connection.rtt : null;
  const saveData = Boolean(connection?.saveData);
  const type = typeof connection?.type === "string" ? connection.type : null;

  const isCellular = Boolean(type === "cellular" || (effectiveType && /2g|3g|4g|5g/.test(effectiveType)));
  const isSlow = Boolean(
    saveData ||
      effectiveType === "slow-2g" ||
      effectiveType === "2g" ||
      (downlink !== null && downlink < 1.5) ||
      (rtt !== null && rtt > 300)
  );

  return {
    effectiveType,
    downlinkMbps: downlink,
    rttMs: rtt,
    saveData,
    isSlow,
    isCellular,
    updatedAt: Date.now(),
  };
};

export const useConnectionQuality = () => {
  const [info, setInfo] = useState<ConnectionQuality>(() => getConnectionInfo());

  useEffect(() => {
    const update = () => setInfo(getConnectionInfo());
    update();

    const connection = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
    if (connection && typeof connection.addEventListener === "function") {
      connection.addEventListener("change", update);
      return () => connection.removeEventListener("change", update);
    }

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return info;
};
