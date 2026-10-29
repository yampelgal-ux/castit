"use client";

// Mounted once in the root layout. Owns the account lifecycle:
//   hydrate the persisted store → restore the Supabase session → start the
//   per-user sync + cross-account sharing → publish the talent card →
//   show a small banner when another device changed something.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, CloudOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { isCloudConfigured, isRealUserId } from "@/lib/cloud/config";
import { installStorageHooks, onSyncedKeyChange, startSync, stopSync } from "@/lib/cloud/sync";
import { refreshShared, startShared, stopShared } from "@/lib/cloud/shared";
import { loadAccountIntoStore } from "@/lib/cloud/auth";
import { publishMyProfile } from "@/lib/cloud/profile";
import { useMyReels } from "@/lib/reels-store";
import { useClaimPendingInvite } from "@/lib/cloud/invites";

export function CloudSync() {
  useClaimPendingInvite();
  const [remoteChange, setRemoteChange] = useState(false);
  const [offline, setOffline] = useState(false);
  const activeUser = useRef<string | null>(null);

  useEffect(() => {
    installStorageHooks();
    void useStore.persist.rehydrate();

    // Remote edits to the app store itself → rehydrate it in place.
    const offKv = onSyncedKeyChange((key, _v, origin) => {
      if (origin !== "remote") return;
      if (key === "castit_app_v1") void useStore.persist.rehydrate();
      else setRemoteChange(true);
    });
    const onShared = () => setRemoteChange(true);
    window.addEventListener("castit:remote-update", onShared);

    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    if (!isCloudConfigured()) {
      return () => {
        offKv();
        window.removeEventListener("castit:remote-update", onShared);
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
      };
    }

    async function activate(userId: string) {
      if (activeUser.current === userId) return;
      activeUser.current = userId;
      const changed = await startSync(userId);
      if (changed) await useStore.persist.rehydrate();
      // Re-persist the in-memory app state so it's stored (and synced) for this account.
      useStore.setState({});
      const { data } = await supabase.auth.getUser();
      if (data.user) await loadAccountIntoStore(data.user);
      await startShared(userId);
      if (changed) setRemoteChange(true);
      // Videos recorded while the upload couldn't reach the cloud: try again now.
      void useMyReels.getState().retryAll();
    }

    async function deactivate() {
      if (!activeUser.current) return;
      activeUser.current = null;
      stopShared();
      await stopSync();
    }

    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (uid) void activate(uid);
      else {
        // Persisted "signed in" state for a cloud account whose session is gone.
        const st = useStore.getState();
        if (st.isAuthed && isRealUserId(st.userId)) st.signOut();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        void activate(session.user.id);
      } else if (event === "SIGNED_OUT") {
        void deactivate();
      }
    });

    const onVisible = () => { if (document.visibilityState === "visible") void refreshShared(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      offKv();
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("castit:remote-update", onShared);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Publish profile / typecast changes so casting pros can find this talent.
  const profile = useStore((s) => s.profile);
  const userId = useStore((s) => s.userId);
  const reels = useMyReels((s) => s.reels);
  useEffect(() => {
    if (!isCloudConfigured() || !isRealUserId(userId)) return;
    const t = setTimeout(() => { void publishMyProfile(userId, profile, reels); }, 1500);
    return () => clearTimeout(t);
  }, [profile, userId, reels]);

  return (
    <AnimatePresence>
      {remoteChange && (
        <motion.button
          key="remote"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          onClick={() => window.location.reload()}
          className="fixed top-[calc(env(safe-area-inset-top)+64px)] inset-x-0 mx-auto w-max max-w-[90vw] z-[60] flex items-center gap-2 rounded-full bg-gold text-on-accent px-4 py-2 text-xs font-semibold shadow-2xl"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          עדכונים חדשים · לחץ לרענון
        </motion.button>
      )}
      {offline && !remoteChange && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="fixed top-[calc(env(safe-area-inset-top)+64px)] inset-x-0 mx-auto w-max max-w-[90vw] z-[60] flex items-center gap-2 rounded-full bg-bg-elevated border border-border text-text-muted px-4 py-2 text-xs shadow-2xl"
        >
          <CloudOff className="w-3.5 h-3.5" />
          אופליין — השינויים יסונכרנו כשהחיבור יחזור
        </motion.div>
      )}
    </AnimatePresence>
  );
}
