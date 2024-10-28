"use client"

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const UpdatePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (newPassword !== confirmNewPassword) {
        setError("New passwords don't match");
        setLoading(false);
        return;
    }

    try {
        // First, verify the current password
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
            throw new Error('User not found');
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: userData.user.email as string,
            password: currentPassword,
        });

        if (signInError) throw new Error('Current password is incorrect');

        // If current password is correct, update to the new password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) throw updateError;

        setSuccess('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');

    } catch (error) {
        setError((error as Error).message);
    } finally {
        setLoading(false);
    }
};

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="block mb-2">Current Password</label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="block mb-2">New Password</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label htmlFor="confirmNewPassword" className="block mb-2">Confirm New Password</label>
        <input
          id="confirmNewPassword"
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
      <button 
        type="submit" 
        className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
};

export default UpdatePasswordForm;