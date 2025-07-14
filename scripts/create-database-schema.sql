-- This script is for initial database schema setup.
-- It creates the 'profiles' table and enables Row Level Security (RLS).

-- Enable the 'uuid-ossp' extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the 'profiles' table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for 'profiles'
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for 'profiles' table:
-- Allow users to view their own profile and other users' profiles
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (TRUE);
-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- Allow users to update their own profile
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile." ON profiles FOR DELETE USING (auth.uid() = id);

-- Create the 'messages' table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles (id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles (id) ON DELETE CASCADE, -- For direct messages
  group_id UUID REFERENCES groups (id) ON DELETE CASCADE, -- For group messages
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' NOT NULL, -- e.g., 'text', 'image', 'video', 'audio'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE -- For ephemeral messages
);

-- Enable Row Level Security (RLS) for 'messages'
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for 'messages' table:
-- Allow users to send messages (insert)
CREATE POLICY "Users can send messages." ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
-- Allow users to view messages they sent or received (select)
CREATE POLICY "Users can view their own messages and messages in their groups." ON messages FOR SELECT USING (
  (auth.uid() = sender_id) OR
  (auth.uid() = recipient_id) OR
  (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))
);
-- Allow users to update their own messages (e.g., mark as read)
CREATE POLICY "Users can update their own messages." ON messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages." ON messages FOR DELETE USING (auth.uid() = sender_id);

-- Create the 'groups' table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  avatar_url TEXT
);

-- Enable Row Level Security (RLS) for 'groups'
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Policies for 'groups' table:
-- Allow any authenticated user to create a group
CREATE POLICY "Authenticated users can create groups." ON groups FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Allow group members to view group details
CREATE POLICY "Group members can view group details." ON groups FOR SELECT USING (
  id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
-- Allow group creators or admins to update group details (more complex RLS might be needed for admins)
CREATE POLICY "Group creators can update their groups." ON groups FOR UPDATE USING (created_by = auth.uid());
-- Allow group creators to delete their groups
CREATE POLICY "Group creators can delete their groups." ON groups FOR DELETE USING (created_by = auth.uid());

-- Create the 'group_members' junction table
CREATE TABLE group_members (
  group_id UUID REFERENCES groups (id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles (id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'member' NOT NULL, -- e.g., 'member', 'admin'
  PRIMARY KEY (group_id, user_id)
);

-- Enable Row Level Security (RLS) for 'group_members'
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Policies for 'group_members' table:
-- Allow group members to view other members of their group
CREATE POLICY "Group members can view other members." ON group_members FOR SELECT USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
-- Allow group creators/admins to add members (more complex RLS might be needed)
CREATE POLICY "Group creators can add members." ON group_members FOR INSERT WITH CHECK (
  group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
);
-- Allow group members to remove themselves
CREATE POLICY "Users can remove themselves from a group." ON group_members FOR DELETE USING (auth.uid() = user_id);
-- Allow group creators/admins to remove members
CREATE POLICY "Group creators can remove members." ON group_members FOR DELETE USING (
  group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
);

-- Set up Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- Function to update 'updated_at' timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for 'profiles' table
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a table for push notification subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles (id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions." ON push_subscriptions
FOR ALL USING (auth.uid() = user_id);

-- Create a table for transactions (for mobile money)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles (id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles (id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  type TEXT NOT NULL, -- e.g., 'mobile_money', 'bank_transfer'
  status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions." ON transactions
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert transactions." ON transactions
FOR INSERT WITH CHECK (auth.uid() = sender_id);
