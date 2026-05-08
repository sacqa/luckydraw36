
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.deposit_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.game_status AS ENUM ('upcoming','live','completed','cancelled');
CREATE TYPE public.txn_type AS ENUM ('credit','debit');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT UNIQUE,
  avatar_url TEXT,
  referral_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text),1,8)),
  referred_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

-- Wallets
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  type public.txn_type NOT NULL,
  reference TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Games
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  prize_image TEXT,
  gallery TEXT[] DEFAULT '{}',
  prize_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  entry_fee NUMERIC(12,2) NOT NULL DEFAULT 1,
  total_slots INTEGER NOT NULL DEFAULT 1000,
  filled_slots INTEGER NOT NULL DEFAULT 0,
  winner_count INTEGER NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  status public.game_status NOT NULL DEFAULT 'live',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  auto_draw BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no TEXT NOT NULL UNIQUE DEFAULT ('LD-' || lpad((floor(random()*1000000))::int::text,6,'0')),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Winners
CREATE TABLE public.winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id),
  prize_value NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

-- Deposit methods
CREATE TABLE public.deposit_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_name TEXT NOT NULL,
  account_title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  qr_image TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deposit_methods ENABLE ROW LEVEL SECURITY;

-- Deposit requests
CREATE TABLE public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  transaction_id TEXT NOT NULL,
  screenshot_url TEXT,
  notes TEXT,
  status public.deposit_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX deposit_txid_unique ON public.deposit_requests(transaction_id);
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

-- Banners
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Trigger: auto profile + wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.phone);
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES
-- profiles
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT USING (auth.uid()=id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE USING (auth.uid()=id);
CREATE POLICY "profiles admin all" ON public.profiles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- wallets
CREATE POLICY "wallet self" ON public.wallets FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wallet admin manage" ON public.wallets FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- wallet_transactions
CREATE POLICY "wt self" ON public.wallet_transactions FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wt admin insert" ON public.wallet_transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

-- games
CREATE POLICY "games read all" ON public.games FOR SELECT USING (true);
CREATE POLICY "games admin write" ON public.games FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- tickets
CREATE POLICY "tickets self read" ON public.tickets FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tickets self insert" ON public.tickets FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "tickets admin all" ON public.tickets FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- winners
CREATE POLICY "winners read all" ON public.winners FOR SELECT USING (true);
CREATE POLICY "winners admin write" ON public.winners FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- deposit_methods
CREATE POLICY "deposit_methods read auth" ON public.deposit_methods FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "deposit_methods admin" ON public.deposit_methods FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- deposit_requests
CREATE POLICY "deposits self read" ON public.deposit_requests FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "deposits self insert" ON public.deposit_requests FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "deposits admin update" ON public.deposit_requests FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- banners
CREATE POLICY "banners read all" ON public.banners FOR SELECT USING (true);
CREATE POLICY "banners admin write" ON public.banners FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- notifications
CREATE POLICY "notifs self" ON public.notifications FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "notifs self update" ON public.notifications FOR UPDATE USING (auth.uid()=user_id);
CREATE POLICY "notifs admin all" ON public.notifications FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- audit_logs
CREATE POLICY "audit admin read" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit admin insert" ON public.audit_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

-- referrals
CREATE POLICY "ref self" ON public.referrals FOR SELECT USING (auth.uid()=referrer_id OR auth.uid()=referred_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ref admin" ON public.referrals FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id,name,public) VALUES
  ('deposit-screenshots','deposit-screenshots',false),
  ('qr-codes','qr-codes',true),
  ('game-images','game-images',true),
  ('banners','banners',true),
  ('profile-images','profile-images',true)
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "ds user upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id='deposit-screenshots' AND auth.uid()::text=(storage.foldername(name))[1]
);
CREATE POLICY "ds user read own" ON storage.objects FOR SELECT USING (
  bucket_id='deposit-screenshots' AND (auth.uid()::text=(storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
);

CREATE POLICY "public buckets read" ON storage.objects FOR SELECT USING (
  bucket_id IN ('qr-codes','game-images','banners','profile-images')
);
CREATE POLICY "admin write public buckets" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('qr-codes','game-images','banners') AND public.has_role(auth.uid(),'admin')
);
CREATE POLICY "user write own profile img" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id='profile-images' AND auth.uid()::text=(storage.foldername(name))[1]
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.winners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;

-- Seed deposit methods + sample games
INSERT INTO public.deposit_methods (method_name,account_title,account_number,instructions) VALUES
  ('Easypaisa','LUCKDROP Pakistan','03001234567','Send money via Easypaisa app, then submit transaction ID + screenshot.'),
  ('JazzCash','LUCKDROP Pakistan','03007654321','Send money via JazzCash app, then submit transaction ID + screenshot.'),
  ('Bank Transfer','LUCKDROP Pakistan','PK36SCBL0000001123456702','Bank: HBL. Send via IBFT and submit transaction ID + screenshot.');

INSERT INTO public.games (title,description,prize_image,prize_value,entry_fee,total_slots,filled_slots,winner_count,featured,ends_at) VALUES
  ('iPhone 17 Pro Max','Win the latest iPhone 17 Pro Max 1TB.','https://images.unsplash.com/photo-1592286927505-1def25115558?w=800',650000,10,5000,1247,1,true, now()+interval '3 days'),
  ('Honda CD 70 Bike','Brand new Honda CD 70 motorcycle.','https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800',195000,5,10000,3402,1,true, now()+interval '5 days'),
  ('PlayStation 5','PS5 Slim Disc Edition.','https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800',150000,5,5000,1820,1,false, now()+interval '4 days'),
  ('Apple Watch Ultra','Apple Watch Ultra 2 Titanium.','https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',230000,5,3000,920,1,false, now()+interval '2 days'),
  ('Umrah Package','Full Umrah package for 1 person.','https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800',450000,20,2000,300,1,true, now()+interval '10 days');
