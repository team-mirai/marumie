-- ============================================
-- 既存データのテナント紐づけマイグレーション
-- ============================================

-- 1. 既存政党用のテナントを作成
-- ※ slug は実際の政党に合わせて変更すること
INSERT INTO tenants (name, slug, description, created_at, updated_at)
SELECT
  display_name,                              -- テナント名として displayName を使用
  slug,                                       -- 政治団体の slug をそのまま使用
  '既存データから自動作成されたテナント',
  NOW(),
  NOW()
FROM political_organizations
LIMIT 1;  -- 現在は単一テナント想定

-- 2. 作成したテナントのIDを取得して変数に格納（PostgreSQL では DO ブロックを使用）
DO $$
DECLARE
  v_tenant_id BIGINT;
BEGIN
  -- 最初に作成したテナントのIDを取得
  SELECT id INTO v_tenant_id FROM tenants ORDER BY id LIMIT 1;

  -- 3. 既存の political_organizations をテナントに紐づけ
  UPDATE political_organizations
  SET tenant_id = v_tenant_id
  WHERE tenant_id IS NULL;

  -- 4. 既存の counterparts をテナントに紐づけ
  UPDATE counterparts
  SET tenant_id = v_tenant_id
  WHERE tenant_id IS NULL;

  -- 5. 既存の donors をテナントに紐づけ
  UPDATE donors
  SET tenant_id = v_tenant_id
  WHERE tenant_id IS NULL;

  -- 6. 既存ユーザーをテナントに紐づけ（owner として追加）
  INSERT INTO user_tenant_memberships (user_id, tenant_id, role, created_at, updated_at)
  SELECT id, v_tenant_id, 'owner', NOW(), NOW()
  FROM users
  WHERE NOT EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = users.id AND tenant_id = v_tenant_id
  );
END $$;
