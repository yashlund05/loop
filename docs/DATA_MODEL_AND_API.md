# DATA_MODEL_AND_API: LOOP

Conventions: UUID primary keys, `created_at`/`updated_at` timestamptz, snake_case. All tables have Row Level Security. Schema changes via Alembic only.

## 1. Enums
```
listing_type:      sell | donate | swap
listing_status:    draft | active | reserved | completed | removed
category:          electronics | furniture | books | hobbies
condition_grade:   like_new | good | fair | poor          -- ordinal 3..0
flag_type:         duplicate_image | price_anomaly | scam_text | sensitive_content | manual_report
flag_status:       open | upheld | dismissed
handover_status:   pending | buyer_confirmed | seller_confirmed | completed | cancelled
swap_status:       proposed | partially_confirmed | confirmed | expired | cancelled
correction_field:  category | subtype | condition | price
data_origin:       real | simulated            -- REQUIRED on rows used by research/sim
```

## 2. Tables

### Identity
```
users(id, auth_uid UNIQUE, display_name, area_name, geohash5, is_verified bool,
      trust_score numeric, role text DEFAULT 'user', created_at)
communities(id, name, type text, email_domain text NULL, join_code text NULL)
memberships(user_id, community_id, verified_at, PRIMARY KEY(user_id, community_id))
```

### Listings
```
listings(id, seller_id→users, community_id→communities, type listing_type,
         category, subtype text, brand text, model text, title, description,
         condition condition_grade, condition_ai condition_grade, condition_conf real,
         price_ask numeric NULL, price_low numeric, price_likely numeric, price_high numeric,
         price_ai_likely numeric, fair_deal text,  -- great | fair | overpriced
         attributes jsonb,        -- category-specific (storage, material, ISBN...)
         area_name, geohash5, location geography(Point) -- coarsened
         status listing_status, views int DEFAULT 0, saves int DEFAULT 0,
         text_embedding vector(384), created_at, completed_at)
listing_images(id, listing_id, storage_path, order int, quality_score real,
               scrub_boxes jsonb,           -- [{x,y,w,h,label,source:"auto|user"}]
               scrubbed bool NOT NULL DEFAULT false,
               phash bigint, image_embedding vector(512), heatmap_path text NULL)
```
Constraint: a listing cannot become `active` unless every image has `scrubbed = true`.

### Swap
```
wishlists(id, user_id, want_category, want_text, want_embedding vector(384),
          max_price numeric NULL, active bool)
swap_cycles(id, status swap_status, length int, solver_version text, created_at)
swap_proposals(id, cycle_id, giver_user_id, receiver_user_id, listing_id,
               confirmed_at NULL, UNIQUE(cycle_id, giver_user_id))
```

### Chat and transactions
```
messages(id, listing_id, sender_id, receiver_id, body, flagged_scam bool DEFAULT false, created_at)
handover_events(id, listing_id, buyer_id, seller_id, meetup_point text,
                status handover_status, otp_hash text, qr_token text, expires_at,
                buyer_confirmed_at, seller_confirmed_at, completed_at)
reviews(id, handover_id UNIQUE-per-reviewer, reviewer_id, reviewee_id, rating 1..5, text)
```
Constraint: `reviews` insert allowed only if `handover_events.status = 'completed'`.

### Safety and audit
```
flags(id, listing_id NULL, message_id NULL, flag_type, score real, reason text,
      status flag_status, created_at, resolved_by NULL, resolved_at NULL)
audit_logs(id, actor_id, action text, target_type, target_id, details jsonb, created_at)
```

### ML and learning
```
corrections(id, listing_id, user_id, field correction_field,
            ai_value text, user_value text, ai_confidence real,
            model_version text, eligible_for_training bool DEFAULT false,
            data_origin, created_at)
model_versions(id, name text, version text, onnx_path text, metrics jsonb,
               baseline_metrics jsonb, trained_on_hash text, is_active bool,
               promoted_at NULL, notes text)
price_history(id, category, subtype, brand, condition, price numeric,
              source text, data_origin, observed_at)     -- observed + completed trades
saved_searches(id, user_id, query_text, filters jsonb, query_embedding vector(384), last_notified_at)
impact_events(id, handover_id, listing_id, co2_kg_avoided numeric, ewaste_kg_avoided numeric,
              factor_source text, assumptions jsonb)
price_drop_suggestions(id, listing_id, suggested_price numeric, reason jsonb,
                       p_sale_7d_before real, p_sale_7d_after real, accepted bool NULL, created_at)
```

### Indexes
GiST on `listings.location`; HNSW on `listings.text_embedding`, `listing_images.image_embedding`; B-tree on `(status, category, created_at)`; GIN on `listings.attributes`; B-tree on `listing_images.phash` (plus Hamming-distance search in service layer).

## 3. API (`/api/v1`, JSON, JWT bearer unless noted)

### Auth and users
| Method | Path | Purpose |
|---|---|---|
| POST | /auth/register, /auth/login, /auth/refresh | Supabase-backed auth |
| POST | /auth/verify-community | body `{community_id, email|join_code}` |
| GET/PATCH | /users/me | profile (coarse area only) |
| GET | /users/{id}/trust | trust score + breakdown |
| DELETE | /users/me | delete account and data |
| GET | /users/me/export | data export |

### Listings
| Method | Path | Purpose |
|---|---|---|
| POST | /listings | create draft |
| PATCH | /listings/{id} | edit; records `corrections` if AI fields changed |
| POST | /listings/{id}/publish | requires all images scrubbed |
| GET | /listings | filters: q, category, type, condition, price_min/max, lat/lng+radius (coarsened), cursor |
| GET | /listings/{id} | detail incl. fair-deal badge and "similar items" |
| POST | /listings/{id}/reserve, /complete | status transitions (complete only via handover) |
| POST | /listings/{id}/images | upload scrubbed image; server re-encodes |
| POST | /listings/{id}/scrub-verify | server-side safeguard scan of an uploaded image |

### AI
| Method | Path | Request → Response |
|---|---|---|
| POST | /ai/analyze-photos | `{image_ids[]}` → `{category{value,conf,top3}, subtype, brand_model, condition{grade,conf,heatmap_url}, price{low,likely,high,reasons[{feature,effect}]}, draft{title,description}, needs_confirmation[]}` |
| POST | /ai/generate-description | listing fields → `{title, description}` |
| POST | /ai/price-estimate | attributes → price range + SHAP reasons |
| POST | /ai/price-drop/{listing_id} | → `{suggestion?, p_before, p_after, reason}` |

### Search
| Method | Path | Purpose |
|---|---|---|
| GET | /search?q=&mode=semantic\|fts | semantic default; `fts` = baseline for evaluation |
| POST | /search/by-image | similar items from an image |
| CRUD | /saved-searches | alerts |

### Chat and handover
| Method | Path | Purpose |
|---|---|---|
| GET | /listings/{id}/messages | history (live via Supabase Realtime) |
| POST | /listings/{id}/messages | send; scam-text check runs |
| GET | /listings/{id}/negotiation-hint | rule-based counter-offer from price range |
| POST | /handovers | create with meetup point |
| POST | /handovers/{id}/qr | generate short-lived QR/OTP (buyer) |
| POST | /handovers/{id}/confirm | `{role, token|otp}`; completes when both confirm |
| POST | /reviews | post-handover only |

### Swap
| Method | Path | Purpose |
|---|---|---|
| POST/GET | /wishlists | submit and list wants |
| GET | /swap/proposals | my proposals |
| POST | /swap/proposals/{id}/confirm | confirm; cycle confirmed when all confirm |

### Impact
| GET | /impact/me, /impact/community | totals with methodology link |

### Admin / moderation (role = moderator)
| Method | Path | Purpose |
|---|---|---|
| GET | /admin/flags | queue with reasons and evidence |
| POST | /admin/flags/{id}/resolve | `{action: uphold\|dismiss\|remove\|warn}`; writes `audit_logs` |
| GET | /admin/model-health | confidence histograms, drift, active model versions |
| GET | /admin/corrections/stats | counts per field |
| POST | /admin/models/{name}/promote | promote a candidate version (guarded; ML_SPEC §7) |

## 4. Standard schemas
```jsonc
// Error
{"error": {"code": "LISTING_NOT_SCRUBBED", "message": "All images must be scrubbed before publishing."}}

// Confidence-bearing prediction
{"value": "good", "conf": 0.71, "top3": [["good",0.71],["fair",0.2],["like_new",0.07]]}

// Scrub box
{"x": 0.12, "y": 0.30, "w": 0.18, "h": 0.22, "label": "face|id_card|plate|phone|address", "source": "auto|user"}
```

## 5. Rate limits (defaults)
Auth 10/min/IP · uploads 20/hour/user · messages 60/min/user · OTP attempts 5 per handover · AI analyze 30/hour/user.

## 6. Seed and test data
`scripts/seed.py` creates one demo community, ~100 listings with `data_origin='simulated'`, and 3 moderator/user accounts for evaluators. No real personal data in seeds.
