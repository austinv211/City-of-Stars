-- A campaign's icon, chosen by its DM and shown beside its name in the app's
-- navigation. Null shows the City of Stars star.
--
-- The ids are the fixed list in src/frontend/core/lib/campaignIcons.ts (a unit
-- test checks the two agree). The existing "campaigns: creator update" policy
-- already lets the DM who created a campaign change it.
alter table public.campaigns
  add column icon text
  constraint campaigns_icon_known check (
    icon is null or icon in (
      'castle', 'crown', 'skull', 'swords', 'shield', 'flame',
      'moon', 'sun', 'mountain', 'trees', 'ship', 'anchor',
      'compass', 'gem', 'scroll', 'wand', 'eye', 'ghost'
    )
  );
