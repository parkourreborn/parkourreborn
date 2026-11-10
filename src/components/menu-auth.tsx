'use client';

import Image from 'next/image';
import { useState } from 'react';
import AccountModal from '@/components/account-modal';
import { useAuth } from '@/components/auth-provider';
import { discordAvatar } from '@/lib/discord';

// The account card in the Tab menu. The whole card is the button: signed out
// it opens the login view, signed in it opens the profile.
export default function MenuAuth() {
  const [open, setOpen] = useState(false);
  const { account, discord, loading } = useAuth();
  const name = account?.displayName || discord?.globalName || discord?.username || 'Guest';
  const avatar = discord ? discordAvatar(discord) : '';

  return (
    <>
      <button className="menu-account" type="button" aria-haspopup="dialog" aria-busy={loading} onClick={() => setOpen(true)}>
        {avatar
          ? <Image className="menu-account__avatar" src={avatar} alt="" width={36} height={36} />
          : <span className="menu-account__avatar" aria-hidden="true">{loading ? '' : name.slice(0, 1)}</span>}
        <span className="menu-account__name">
          <span className="sr-only">Account: </span>
          {loading ? <><span className="menu-account__loading" aria-hidden="true" /><span className="sr-only">Checking login</span></> : name}
        </span>
      </button>
      {open ? <AccountModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
