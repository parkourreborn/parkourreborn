'use client';

import { useState } from 'react';
import AccountModal from '@/components/account-modal';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { discordAvatar } from '@/lib/discord';

export default function MenuAuth() {
  const [open, setOpen] = useState(false);
  const { account, discord, loading } = useAuth();
  const name = account?.displayName || discord?.globalName || discord?.username || 'Guest';
  const avatar = discord ? discordAvatar(discord) : '';
  const status = loading ? 'Checking' : discord ? 'Signed in' : 'Signed out';

  return (
    <div className="menu-auth">
      <Button className="menu-auth__card" type="button" tabIndex={-1} aria-label="Account" onClick={() => setOpen(true)}>
        {avatar
          ? <img src={avatar} alt="" width={32} height={32} />
          : <span className="menu-auth__avatar" aria-hidden="true">{name.slice(0, 1)}</span>}
        <span>
          <strong>{name}</strong>
          <small>{status}</small>
        </span>
        <span className="menu-auth__go">Account</span>
      </Button>
      {open ? <AccountModal onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
