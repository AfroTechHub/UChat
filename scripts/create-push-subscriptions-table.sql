-- This script creates the push_subscriptions table if it doesn't exist.
-- It's part of the push notification feature.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles (id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS) for push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for push_subscriptions:
-- Users can manage their own push subscriptions.
CREATE POLICY "Users can manage their own push subscriptions." ON public.push_subscriptions
FOR ALL USING (auth.uid() = user_id);
