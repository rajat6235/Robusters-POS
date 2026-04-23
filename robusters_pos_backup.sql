--
-- PostgreSQL database dump
--

\restrict L5h84BEtXDfL6D4GsJmtYutgU2cdPnMEOSIu4lCubeN1YqzwJUA44bv1ykAA0ZT

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg12+1)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: diet_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.diet_type AS ENUM (
    'VEGAN',
    'VEG',
    'EGGETARIAN',
    'NON_VEG'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'PENDING',
    'PREPARING',
    'READY',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'CASH',
    'CARD',
    'UPI',
    'LOYALTY'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'PENDING',
    'PAID',
    'FAILED'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'MANAGER'
);


--
-- Name: variant_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.variant_type AS ENUM (
    'SIZE',
    'PORTION',
    'CARB_TYPE',
    'CUSTOM'
);


--
-- Name: calculate_order_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_order_totals() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Recalculate order totals when order items change (no tax)
    UPDATE orders 
    SET 
        subtotal = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM order_items 
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ),
        tax = 0,
        total = (
            SELECT COALESCE(SUM(total_price), 0)
            FROM order_items 
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: check_package_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_package_completion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.consumed_meals >= NEW.total_meals AND (OLD.consumed_meals IS NULL OR OLD.consumed_meals < OLD.total_meals) THEN
    NEW.status = 'completed';
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(50) NOT NULL,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addons (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    unit character varying(50) DEFAULT 'piece'::character varying,
    unit_quantity numeric(6,2),
    calories integer,
    protein_grams numeric(6,2),
    addon_group character varying(50),
    display_order integer DEFAULT 0,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    image_url character varying(500),
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: category_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_addons (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    addon_id uuid NOT NULL,
    price_override numeric(10,2),
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_meal_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_meal_packages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid NOT NULL,
    package_id uuid NOT NULL,
    total_meals integer NOT NULL,
    consumed_meals integer DEFAULT 0,
    remaining_meals integer GENERATED ALWAYS AS ((total_meals - consumed_meals)) STORED,
    package_price numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    starts_at date NOT NULL,
    expires_at date,
    status character varying(20) DEFAULT 'active'::character varying,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT amount_paid_valid CHECK (((amount_paid >= (0)::numeric) AND (amount_paid <= package_price))),
    CONSTRAINT consumed_not_exceed_total CHECK ((consumed_meals <= total_meals)),
    CONSTRAINT total_meals_positive CHECK ((total_meals > 0))
);


--
-- Name: customer_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid NOT NULL,
    order_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid NOT NULL,
    dietary_restrictions text[],
    allergies text[],
    favorite_items uuid[],
    preferred_payment_method character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    date_of_birth date,
    total_orders integer DEFAULT 0,
    total_spent numeric(12,2) DEFAULT 0,
    loyalty_points integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: item_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_addons (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    menu_item_id uuid NOT NULL,
    addon_id uuid NOT NULL,
    price_override numeric(10,2),
    is_allowed boolean DEFAULT true,
    max_quantity integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: item_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_variants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    menu_item_id uuid NOT NULL,
    name character varying(50) NOT NULL,
    label character varying(100),
    price numeric(10,2) NOT NULL,
    calories integer,
    protein_grams numeric(6,2),
    display_order integer DEFAULT 0,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    address text,
    phone character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: meal_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_packages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    meal_count integer NOT NULL,
    price numeric(10,2) NOT NULL,
    validity_days integer,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT meal_count_positive CHECK ((meal_count > 0)),
    CONSTRAINT price_positive CHECK ((price >= (0)::numeric))
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    category_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    slug character varying(150) NOT NULL,
    description text,
    image_url character varying(500),
    diet_type public.diet_type DEFAULT 'VEG'::public.diet_type NOT NULL,
    base_price numeric(10,2),
    has_variants boolean DEFAULT false,
    variant_type public.variant_type,
    calories integer,
    protein_grams numeric(6,2),
    carbs_grams numeric(6,2),
    fat_grams numeric(6,2),
    fiber_grams numeric(6,2),
    display_order integer DEFAULT 0,
    is_available boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    menu_item_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    variant_ids jsonb DEFAULT '[]'::jsonb,
    addon_selections jsonb DEFAULT '[]'::jsonb,
    special_instructions text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    item_name character varying(255)
);


--
-- Name: order_number_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_number_counters (
    date_key date NOT NULL,
    counter integer DEFAULT 0 NOT NULL
);


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id integer NOT NULL,
    order_id uuid,
    previous_status character varying(50),
    new_status character varying(50),
    changed_by uuid,
    reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: order_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_status_history_id_seq OWNED BY public.order_status_history.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_phone character varying(20),
    customer_name character varying(100),
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    tax numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    payment_method public.payment_method NOT NULL,
    payment_status public.payment_status DEFAULT 'PENDING'::public.payment_status NOT NULL,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    customer_id uuid,
    location_id uuid,
    status character varying(50) DEFAULT 'CONFIRMED'::character varying,
    cancellation_requested_by uuid,
    cancellation_requested_at timestamp without time zone,
    cancellation_reason text,
    cancelled_by uuid,
    cancelled_at timestamp without time zone,
    customer_package_id uuid,
    meals_consumed integer DEFAULT 0,
    is_package_order boolean DEFAULT false,
    loyalty_points_redeemed integer DEFAULT 0 NOT NULL
);


--
-- Name: package_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_activity_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    changes jsonb,
    metadata jsonb,
    customer_id uuid,
    package_id uuid,
    ip_address inet,
    user_agent text
);


--
-- Name: package_allowed_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_allowed_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    package_id uuid NOT NULL,
    menu_item_id uuid,
    variant_id uuid,
    category_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT must_have_item_or_category CHECK (((menu_item_id IS NOT NULL) OR (category_id IS NOT NULL)))
);


--
-- Name: package_meal_consumption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_meal_consumption (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_package_id uuid NOT NULL,
    order_id uuid NOT NULL,
    meals_consumed integer DEFAULT 1,
    consumed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    order_total numeric(10,2),
    order_items jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role public.user_role DEFAULT 'MANAGER'::public.user_role NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: order_status_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history ALTER COLUMN id SET DEFAULT nextval('public.order_status_history_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_logs (id, user_id, action, details, ip_address, user_agent, created_at) FROM stdin;
e615cb66-70d8-4099-b89f-b164002423c8	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	node	2026-01-26 10:08:33.086265+00
87743535-3eef-4165-9ffa-d4e136178e90	d901cbdb-101b-49e3-a421-4d01a572b77a	USER_CREATED	{"createdUserId": "2bd751d5-32c1-4bbd-b083-2ad13f70bde2", "createdUserRole": "MANAGER", "createdUserEmail": "ustad@robusters.com"}	::1	node	2026-01-26 10:09:29.608938+00
f4741731-15ba-453a-891d-fdff0b0f5bf9	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	node	2026-01-26 10:09:43.944319+00
3baa0f41-fa3e-4b54-bd8d-a52ee786f4fd	2bd751d5-32c1-4bbd-b083-2ad13f70bde2	LOGIN	{"email": "ustad@robusters.com"}	::1	node	2026-01-26 10:09:58.588569+00
10093369-af70-4a2c-9f88-619d75907522	2bd751d5-32c1-4bbd-b083-2ad13f70bde2	LOGOUT	{"email": "ustad@robusters.com"}	::1	node	2026-01-26 10:10:04.21985+00
bfd30f2e-fd98-474a-845c-44b0b3cddbc6	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	node	2026-01-26 10:10:06.779753+00
a6146dfe-8f3b-49e7-a01b-4b779de054d5	d901cbdb-101b-49e3-a421-4d01a572b77a	USER_UPDATED	{"changes": {"role": "MANAGER", "email": "ustad@robusters.com", "lastName": "ggg", "firstName": "ustad"}, "updatedUserId": "2bd751d5-32c1-4bbd-b083-2ad13f70bde2", "updatedUserEmail": "ustad@robusters.com"}	::1	node	2026-01-26 10:10:17.636598+00
a59e4c93-ec3b-42b8-baed-751f0eccd63f	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	node	2026-01-27 07:41:57.544588+00
41984ca8-97be-4c31-b9c7-dedfdd074e89	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	node	2026-01-28 05:25:37.459423+00
c280a84c-8ae3-4270-b78d-ecad2db3d35e	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	node	2026-01-28 07:04:27.620926+00
b2b943ea-4d23-4dee-a474-d1bec83a79ea	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	node	2026-01-28 07:04:30.083634+00
f2cc36a4-0850-47b1-ac09-630d8afeb05e	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	node	2026-01-28 07:04:33.765923+00
b694d4b9-ed38-4014-a5c4-b87661f54e54	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	node	2026-01-28 07:04:57.768668+00
1d9cabc9-57c8-4a7d-b8e3-375d1d80980b	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	node	2026-01-28 07:48:12.916045+00
88989404-28dd-4f2c-8b28-595bb29ca6db	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	node	2026-01-28 07:48:22.880484+00
22eee818-c59a-4239-ae99-41102267eb59	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	curl/8.7.1	2026-01-28 08:18:33.404847+00
e1e9b9f0-73d1-4379-9e82-84b810ac4fd1	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-28 11:24:21.849213+00
5e584029-1882-4f1f-ac50-e0fc01780491	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	node	2026-01-28 11:25:34.813568+00
d75e0105-3663-4a61-b38a-e7d53492eebb	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-28 11:30:17.473255+00
6971e8e4-41af-460a-9152-5c355673bbf0	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	node	2026-01-28 15:35:14.810013+00
e565c4a4-99a4-4324-8239-2689bceac837	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	node	2026-01-28 15:35:14.887397+00
53c66e5d-2b22-4c95-a191-2d703037cca0	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	curl/8.7.1	2026-01-29 08:15:45.961725+00
da45f051-343d-489e-99de-64a9b7c34164	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:16:21.939688+00
ea5db303-f573-43d8-be8b-0e09657a96bf	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:16:26.91582+00
c0810c11-6e44-4adf-8c6a-6c06215f5708	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:18:33.180558+00
6ccae770-e26c-4af0-9bd6-298b759f9b17	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:18:35.552632+00
59a8045f-729a-435b-bf37-fe781f48dec1	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:18:50.396392+00
5d4c12c1-60da-48ec-9d7f-1c99b9667df8	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:18:55.535616+00
746b4031-4244-4d76-8124-93f16e5bcc88	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:18:58.429505+00
1dd761a5-1379-495a-9cbe-845612a5e440	\N	LOGIN_FAILED	{"email": "rajat@nevrio.tech", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:19:50.903147+00
153d7f45-faa5-4dcd-98e5-891135c31cfa	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:20:03.524284+00
e7048c66-7511-490b-a470-e40e44a2dafe	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:31:05.51668+00
7ea9b80b-45d4-4a33-bf6b-fb2f82f7098f	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:31:08.580239+00
f035bc51-5378-4235-9a06-8cb534fa43b2	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:31:57.152006+00
b2af8263-2b21-4551-926f-3a65a1190d58	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 08:32:00.518217+00
d99ccfca-b6d8-4f2f-84e7-f35c23682c7e	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-29 09:42:59.664144+00
83693736-5863-4aca-bc3f-49c745fe1fed	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-29 09:43:30.56175+00
89ae57a5-4b18-4934-9efa-3578c9878d43	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-29 09:44:00.799321+00
570661c8-fbb8-4beb-8645-12c65bf1c9d3	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-29 09:48:00.493672+00
d57a142a-73a7-49ff-b585-386cb01c0821	d901cbdb-101b-49e3-a421-4d01a572b77a	USER_UPDATED	{"changes": {"role": "ADMIN", "email": "admin@robusters.com", "lastName": "Admin", "firstName": "Robuster's", "passwordChanged": true}, "updatedUserId": "d901cbdb-101b-49e3-a421-4d01a572b77a", "updatedUserEmail": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 09:50:35.44233+00
3795c697-3434-4ba0-ab36-5d060e4cbdf7	d901cbdb-101b-49e3-a421-4d01a572b77a	USER_UPDATED	{"changes": {"role": "MANAGER", "email": "ustad@robusters.com", "lastName": "ggg", "firstName": "ustad", "passwordChanged": true}, "updatedUserId": "2bd751d5-32c1-4bbd-b083-2ad13f70bde2", "updatedUserEmail": "ustad@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	2026-01-29 10:39:12.525145+00
4d16a656-0510-4c82-b451-44346b01e86e	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	2026-01-29 10:39:20.930846+00
239b3fcc-28fe-4f95-8b6e-70bfecd55cdf	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	2026-01-29 10:39:31.098368+00
e61ea5cf-2699-4e77-8be3-59aeaee6b0f3	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	2026-01-29 10:39:35.372101+00
5bba22e5-7ab5-4f01-9d68-70203f245482	2bd751d5-32c1-4bbd-b083-2ad13f70bde2	LOGIN	{"email": "ustad@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	2026-01-29 10:39:54.925588+00
951d1cef-87b1-4bf6-8327-1bf59148f7ed	2bd751d5-32c1-4bbd-b083-2ad13f70bde2	LOGOUT	{"email": "ustad@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 10:43:12.478799+00
c6c3b161-3f4d-4fa0-bc48-a980bd28e90b	\N	LOGIN_FAILED	{"email": "clint@admin.com", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 11:21:25.998314+00
429df8ab-0b89-4b4f-80c2-dc0d6d08a8d7	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 11:21:56.337484+00
b1c7e887-3370-4565-8238-2aca832e6164	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 12:12:03.968216+00
1b657785-1a1c-428e-b74d-c8f5c387c798	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-29 12:39:07.268093+00
066e05d9-eb8d-43b4-904b-a549c1a0f410	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-29 12:39:15.46214+00
4c5b5443-b6f9-49ad-afc6-231815fd99be	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-29 14:25:48.10725+00
1a7de2fe-c120-4713-9bfb-4f72d68ebf9f	\N	LOGIN_FAILED	{"email": "admin@robuster.com", "reason": "User not found"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-29 14:46:04.772147+00
7c25f6e2-cb50-474d-a118-4850f7175d4f	\N	LOGIN_FAILED	{"email": "admin@robuster.com", "reason": "User not found"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-29 14:46:18.880382+00
13d68457-2156-43b8-a213-555ecd4e44c6	\N	LOGIN_FAILED	{"email": "admin@robuster.com", "reason": "User not found"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-29 14:46:40.496747+00
45af4ea7-2cdd-4084-89b8-d6b7b67183d8	\N	LOGIN_FAILED	{"email": "admin@robusterfitness.com", "reason": "User not found"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-29 14:47:09.602571+00
0f2c9781-a06e-4077-9a3a-6a71a9df8f6b	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-29 14:47:23.512518+00
458333c5-c0eb-4f6d-bd3b-e5c644c12330	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-29 15:06:05.126285+00
17680a1a-d487-4716-a441-8ceede0bed9b	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-29 15:06:27.817903+00
603f7b5e-73c4-4581-880f-93f57f1b27d9	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-30 05:13:02.729144+00
b55733dc-e24a-42bc-a6b6-5b5f1667f429	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-30 06:03:32.250444+00
6bcd6077-26e7-4cbd-9d23-646a51a058d8	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	curl/8.7.1	2026-01-30 06:39:31.121159+00
c5087873-e6e2-4dc1-8ec3-448d5f32a103	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	curl/8.7.1	2026-01-30 06:39:39.951499+00
d68413a5-326a-4621-b6ee-1560051d4e00	2bd751d5-32c1-4bbd-b083-2ad13f70bde2	LOGIN_FAILED	{"reason": "Invalid password"}	::1	curl/8.7.1	2026-01-30 06:39:56.950527+00
38c3d2f2-3889-423f-b3b2-75740004b6fb	\N	LOGIN_FAILED	{"email": "clint@admin.com", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-30 06:50:31.78661+00
a4d8acc1-c4f5-4242-bf19-488920324d86	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-30 06:50:45.563437+00
71e4942d-4536-4c99-9c92-1ddea224c2f0	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-30 06:50:54.165483+00
b8d74aaf-da0e-4a6a-96e6-a56a66705d6b	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-30 07:47:37.719096+00
57215bd0-0926-4963-9ce6-f8658da2ecf8	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	curl/8.7.1	2026-01-30 10:37:05.475666+00
cf4ca292-2fd5-4698-991b-bf4eb0538a9b	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-30 10:37:51.364145+00
2e954765-d1ef-4a15-8193-dc7c60bc9030	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-30 10:42:42.823215+00
22920898-9e4f-46b7-8a71-67a8333dbaaa	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-30 10:43:27.052515+00
206af20e-34ec-4390-8e80-292f18ecf90b	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-30 10:43:35.828369+00
82a8e9ca-aa4b-4ea6-ad62-497356877f44	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CANCELLATION_REQUESTED	{"reason": "ewfraqwrefaqewdfa", "orderId": "932a1c81-31eb-455c-bfba-7eb53809a3f5", "orderTotal": 1040, "orderNumber": "ORD-20260129-0002", "paymentMethod": "CASH"}	\N	\N	2026-01-30 11:11:20.448771+00
238f477d-9ae8-4a70-ae69-bf1eac2aeee7	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-31 05:38:53.426287+00
ab111c44-6cbe-4674-b5c3-da81784ae7d4	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-31 06:09:36.782791+00
056646f6-32e9-43b3-a273-f4df5f9d5362	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 430, "orderId": "7668b1b6-8878-476e-9f8c-71863b4ee3a6", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260131-0001", "customerName": "rajat Gupta", "customerPhone": "07837733549", "paymentMethod": "CASH"}	\N	\N	2026-01-31 09:56:15.319726+00
44c847b2-184e-4863-a08e-e5e650b6b854	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	curl/8.7.1	2026-01-31 13:01:26.119345+00
a334688e-bb4c-4cfe-bd66-0c79bf2af65b	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-31 13:02:06.076312+00
a2d4a71c-78e2-449d-8a7f-c5f3f909ba12	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-01-31 13:47:14.347357+00
c88f8d39-d47b-4278-92a3-98c2b6711fa3	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	curl/8.7.1	2026-01-31 14:03:13.36113+00
fc5ec628-6489-4530-b5db-28f518e71958	\N	LOGIN_FAILED	{"email": "admin@example.com", "reason": "User not found"}	::1	curl/8.7.1	2026-01-31 14:03:18.045805+00
4bac3401-c89b-401c-9a3d-2038ff36c10d	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-01-31 14:04:44.995255+00
406fd24b-4a20-433a-b231-0a62617bc7f0	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-01-31 15:16:00.970968+00
d1306fae-a5fc-4b67-8e5d-bf53f6999915	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-02-02 02:45:14.957796+00
d92a295a-4e62-4d92-b793-790e9fc51f80	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-02-03 13:41:41.739668+00
dc8db277-e1a5-42dc-88b0-800e1f43aedd	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "6dc8a776-b151-4053-b710-cb5e7729dfd3", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0001", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:04:38.511553+00
f0e6059c-f050-41a6-8cb1-59dec757f0ef	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 350, "orderId": "3aba4f3b-b2fa-43ed-9e0f-1a52f52d9d6c", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0002", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:05:39.572056+00
8a2cbd26-f45e-4e78-8ec4-92442d3488cd	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "012e9b8a-5a47-4bd4-8a49-df8a146c5d5c", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0003", "paymentMethod": "CASH"}	\N	\N	2026-02-03 14:06:31.419265+00
9bd9505e-bd6b-42cd-aefd-937325ffad6e	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "d4c5124b-6ed4-46ea-980c-d480d3ba35eb", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0004", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:07:19.522455+00
916a0ce2-88ef-4866-b55c-924ee24ab1d4	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 240, "orderId": "85d869a5-b261-46a4-bbaa-d659a1537522", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0005", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:08:05.866397+00
7dd33ca9-56fd-4826-b758-5f64ab43d952	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "6b6041a8-e18e-43e4-b8d2-61cd1a24e210", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0006", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:09:41.02931+00
d6219a17-0213-4aac-89e1-a91d4f1b33b5	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "898144f1-d22b-4e52-b16a-46e5a2bb5456", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0007", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:09:57.244857+00
dd18b582-607c-478d-829e-a65328ab8c8b	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 580, "orderId": "df8db34e-6a9e-4e45-948e-1df1298a4c52", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0008", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:10:44.322189+00
6dfe9063-cf2e-4b06-b6aa-50afeb2ea2e2	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 170, "orderId": "ded49685-6dfd-40d7-9d08-fed13f77169e", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0009", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:11:13.42625+00
f9231aa3-0431-4030-9e60-a2c0b3b6c057	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "6dc00138-9273-4081-9c84-cab7fe1f2fae", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0010", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:11:38.366691+00
fc699632-8dcd-4b55-a8ed-4924217448a2	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 270, "orderId": "8517cb95-2584-4794-ace5-dc6ff0a26442", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0011", "paymentMethod": "CASH"}	\N	\N	2026-02-03 14:13:16.335531+00
ffbca758-35c2-4e4e-8157-46d3d4cd19be	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "04558fc6-575b-42f0-86ba-5f9e34d345d3", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0012", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:13:35.118438+00
9b4a361e-86b4-49e9-a876-00b8ab5baec2	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "e67f8624-b67e-4e69-8c6d-5a8979096e75", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0013", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:14:01.864006+00
8e8c89ad-5a08-4057-9095-b9795d747d7a	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 240, "orderId": "83947941-b749-4896-957e-2a682b523ea4", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0014", "paymentMethod": "CASH"}	\N	\N	2026-02-03 14:15:04.307105+00
b7dbc3b8-d0e9-4afe-95a7-b31b96f56f20	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 120, "orderId": "a6a6e407-38d9-42b8-ad64-2f97994d7bf5", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0015", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:16:22.879717+00
11f17a0b-806c-4522-876b-bb540a4629b7	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 250, "orderId": "5b5a251e-e608-43bf-a9be-da535ac77097", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0016", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:17:01.783289+00
c0c92d5b-c748-4522-9e42-57001babc145	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 240, "orderId": "e29c5dcc-8f7b-4d8d-bb35-35a438b6b27e", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0017", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:17:53.238099+00
9c33fb17-88ed-4cab-a3f2-a877ea503cc9	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 170, "orderId": "416d322e-3bc2-4b23-8bb0-56410a1a39c2", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0018", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:18:06.775812+00
efcb4993-4fcf-4c43-8044-1962ad64723d	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "ffb366c5-b72a-4b63-b830-0e41b064f442", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0019", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:18:28.49364+00
b37f6a8d-3492-462f-a29f-0a318b8d4d9d	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "c8d06d15-5e32-4339-8f52-1fe36503203e", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0020", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:19:07.736102+00
e91e68f0-a22e-4e39-b531-818b6f7f45c2	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 210, "orderId": "2b24dbb6-c319-4e55-aeb3-38d456e9fa3f", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0021", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:19:42.299932+00
4736d034-b61f-4696-931c-33a7a2fdac1e	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "a8644ac1-e0cf-464d-928f-0204f3699380", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0022", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:20:08.35471+00
d6d56bab-dc6c-4c6c-b47e-302b3d841e57	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "93740e89-1ca3-43de-aba9-e1f26f366c78", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0023", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:20:30.125783+00
8a38b8a3-cb1d-4208-b96e-f586d9e7f1a9	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "0076d71c-923c-4ef1-956c-f896d6f0cac1", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0024", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:20:43.932091+00
01292017-27ca-4730-89c9-5e8d5bc12e1e	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 280, "orderId": "2ce06549-d28a-4b56-9431-39bb102f5725", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0025", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:37:06.530177+00
a4193ce6-7a08-427b-b920-0910dde5ae88	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 800, "orderId": "cac1e02a-aee1-42b8-9a5f-647ab90ead1f", "itemCount": 3, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0026", "paymentMethod": "UPI"}	\N	\N	2026-02-03 14:40:49.347101+00
88d0d675-d528-4026-b263-398c2ae3a055	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 170, "orderId": "357b03fd-1b3a-4570-98ec-f5ffc98a0562", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0027", "paymentMethod": "UPI"}	\N	\N	2026-02-03 15:02:13.664097+00
b8420ec5-91c1-41f6-929b-b54eb3c0c023	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 200, "orderId": "06e969de-f502-4047-91a4-8a802fdc0e7b", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0028", "paymentMethod": "UPI"}	\N	\N	2026-02-03 15:15:56.408104+00
e152d774-e88b-47dd-8b6e-a79c5903d203	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "ba0d4df4-a092-4512-a88e-8b648503b052", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0029", "paymentMethod": "UPI"}	\N	\N	2026-02-03 15:16:56.151733+00
0aebf048-92f1-41e5-bb63-bd8637370e4b	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 110, "orderId": "75882362-337b-4ff6-8c88-45ee576d876e", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0030", "paymentMethod": "UPI"}	\N	\N	2026-02-03 15:36:49.978004+00
9f39ed23-8c12-4437-a9cb-f2a0968b1e11	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 20, "orderId": "34e966e3-840e-4903-8d71-d9eedd2eee69", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260203-0031", "paymentMethod": "CASH"}	\N	\N	2026-02-03 15:37:48.106701+00
54f44f96-434e-4ac3-a9a5-b59be262e7a4	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-02-04 06:19:51.814683+00
e078d540-9a6c-4aa1-8c9c-22b6a1fe345a	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 280, "orderId": "7303a07d-a7d1-41ee-9aa3-53ba013e1518", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260204-0001", "customerName": "rajat Gupta", "customerPhone": "07837733549", "paymentMethod": "CASH"}	\N	\N	2026-02-04 06:21:31.700189+00
67be1d47-25c7-4f2e-be37-43b8fa0cac31	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-02-04 07:14:41.473925+00
49f0ff48-2d68-4fda-8039-05f3cd9105e2	\N	LOGIN_FAILED	{"email": "admin@robustersfitness.com", "reason": "User not found"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-02-04 08:11:14.407978+00
6d8017a8-b494-4f68-b227-e5ce98bc0c9a	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36	2026-02-04 08:11:31.089454+00
450e2530-ccd4-497e-8890-cef7b8bd856d	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-02-04 08:11:46.256744+00
944d8893-fc64-4141-b8e4-92a9af3aed48	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-02-04 14:25:12.946713+00
6667f079-f578-45cb-8f93-6fb46e457648	\N	LOGIN_FAILED	{"email": "admin@robustersfitness.com", "reason": "User not found"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-02-06 14:50:18.382168+00
5e82f1f6-d4e7-4f80-83dc-d5bda44a1bef	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-02-09 10:41:22.912903+00
1de0d6a7-8d3b-4610-84b3-8037848f1309	\N	LOGIN_FAILED	{"email": "admin@robustersfitness.com", "reason": "User not found"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-02-09 12:26:12.56011+00
bc98771f-c08d-4f69-8f79-78c41ba1c308	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-03-11 07:29:31.648828+00
00920141-b2da-4593-8bb4-53b4cf834a93	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36	2026-03-11 07:29:40.640217+00
b529b8bc-dc2c-4ad8-bfe2-9c8ac59fc1fb	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-18 11:15:18.767334+00
630a3f09-7f9a-4c84-b7d0-f32f5a3cbff3	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-18 11:15:31.121097+00
2f6d7977-96e9-46f6-bc07-59fe448963a3	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-03-18 11:19:35.757427+00
14da7ef4-c460-4428-b365-51e6cd8fea3a	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.40 Mobile/15E148 Safari/604.1	2026-03-18 11:21:11.855877+00
7863919a-128c-4b77-9b69-f90bfbb13760	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-18 11:23:22.415285+00
ca81a59a-cc3a-4815-bda8-6a9d9af21efc	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "900658de-03fa-47ec-8ab1-745ba4006ddf", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260318-0001", "paymentMethod": "UPI"}	\N	\N	2026-03-18 11:33:54.025369+00
17cd93d1-511a-46d2-9d38-f0b28fde46a6	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 420, "orderId": "59225ae3-2425-4089-a25f-50d9ccc9c855", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260318-0002", "paymentMethod": "UPI"}	\N	\N	2026-03-18 11:58:30.518931+00
b58d139c-7ea8-4e5d-a8bf-5557ea7a6d25	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "c1bc14f6-4837-4ec0-bad6-3f353b5e571c", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260318-0003", "paymentMethod": "CARD"}	\N	\N	2026-03-18 12:09:31.620638+00
60be97a8-39cb-4e61-b9a1-1fed79d2067e	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 250, "orderId": "3bf86238-85dd-4c53-bd06-56e29632ec7f", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260318-0004", "paymentMethod": "CASH"}	\N	\N	2026-03-18 12:53:25.502067+00
e9a8d91e-8aba-4081-aeb7-e30545dd324d	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.40 Mobile/15E148 Safari/604.1	2026-03-20 05:35:53.572257+00
9b8d8255-fd69-42a0-9c98-52e922b95b14	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 400, "orderId": "8680c818-e6ee-4b62-a31c-5427f9a37d5d", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260320-0001", "paymentMethod": "CASH"}	\N	\N	2026-03-20 06:13:37.671442+00
dc49850e-dead-43b1-90b7-68e608c600fa	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "2716b43f-2faf-4ce5-952b-af03c04b5b0d", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260320-0002", "paymentMethod": "CASH"}	\N	\N	2026-03-20 07:10:13.999454+00
84a4dba0-229d-4db4-abe0-7ea24d4e71d8	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.40 Mobile/15E148 Safari/604.1	2026-03-20 14:54:20.117669+00
848a99ac-cbca-4e81-84f5-292b4f45c22e	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-21 14:09:09.219575+00
29bb8099-3c48-4c81-b2c0-36e361e6fc74	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-21 14:40:08.687615+00
19ae1be6-969f-41fb-a6d4-eba1e65a15ac	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-21 14:47:05.042151+00
c252e32b-b910-4634-8f74-b85a93e3d80a	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-21 14:47:46.442195+00
e72b6a0a-32c3-4b3e-bf41-eee549f4bad0	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-21 14:58:28.923207+00
03e41032-3da3-427a-8113-666b6b35a60d	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-21 14:58:33.875129+00
25223010-5a40-4d2f-97e4-42b689c58e3b	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-03-22 04:42:43.839537+00
ed980e26-0e0b-4546-ac13-feac2e4b54ef	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-03-22 04:44:01.759148+00
5e7b030d-d161-4d60-af5a-0d7f51b1cdf1	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-03-22 04:44:20.737191+00
614b609e-81b3-4f18-a9ed-e1bbafa8d94b	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 260, "orderId": "505b4403-92ad-4491-802a-6bf935682f45", "itemCount": 1, "orderNumber": "ORD-20260322-0001", "customerName": "Test Customer", "customerPhone": "9876543210", "paymentMethod": "CASH"}	\N	\N	2026-03-22 04:44:23.73797+00
d7de7288-5a44-4326-89c9-bfff73530117	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-03-22 04:44:47.848074+00
83af4bc0-1a9f-4e52-b8a9-297275f84c93	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "a27d37d1-f82c-4d8c-8322-518a1c46fa0d", "itemCount": 1, "orderNumber": "ORD-20260322-0002", "customerName": "Concurrent 3", "customerPhone": "1110000003", "paymentMethod": "CASH"}	\N	\N	2026-03-22 04:44:51.845478+00
7c3245cf-ee06-4543-92df-9665453df457	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "ff28bf75-337e-4930-b457-e2d0eab57ece", "itemCount": 1, "orderNumber": "ORD-20260322-0003", "customerName": "Concurrent 2", "customerPhone": "1110000002", "paymentMethod": "CASH"}	\N	\N	2026-03-22 04:44:52.789507+00
25daa012-0c3f-4f54-925e-1b5750eb2d64	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "14440137-ef6f-40ad-a214-b48c072faf47", "itemCount": 1, "orderNumber": "ORD-20260322-0005", "customerName": "Concurrent 1", "customerPhone": "1110000001", "paymentMethod": "CASH"}	\N	\N	2026-03-22 04:44:52.869434+00
779441ea-3f88-4a80-9bce-2d44bf52e1db	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "c7c06c18-5f03-4783-b878-d116deb207ba", "itemCount": 1, "orderNumber": "ORD-20260322-0004", "customerName": "Concurrent 4", "customerPhone": "1110000004", "paymentMethod": "CASH"}	\N	\N	2026-03-22 04:44:53.443063+00
472ce002-2dc0-42d3-809c-c94852fcd531	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "b1717c91-6237-4c02-ac58-f993ec26b7f7", "itemCount": 1, "orderNumber": "ORD-20260322-0006", "customerName": "Concurrent 5", "customerPhone": "1110000005", "paymentMethod": "CASH"}	\N	\N	2026-03-22 04:44:53.655094+00
82165d80-9ae9-44ed-bed8-d88cf4958e12	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-03-22 04:45:09.311748+00
1c827eea-8ce7-4dbf-be79-ac34663fc705	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "b25993bf-eaea-477a-9e3b-b04892cfbd71", "itemCount": 1, "orderNumber": "ORD-20260322-0007", "customerName": "Duplicate Test", "customerPhone": "9999888777", "paymentMethod": "CASH"}	\N	\N	2026-03-22 04:45:14.126583+00
f23596e8-9a89-4a80-8e4a-f2327384515f	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "741433f9-c5e5-4c2e-baa7-683c48d8bac3", "itemCount": 1, "orderNumber": "ORD-20260322-0008", "customerName": "Duplicate Test", "customerPhone": "9999888777", "paymentMethod": "CASH"}	\N	\N	2026-03-22 04:45:14.276567+00
49911d20-f08e-45f0-9a6e-159df160f759	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-03-22 04:46:38.180379+00
91870416-ffef-43c4-b62b-5677fa7003a1	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "c7e223ea-5b8f-489a-a09a-dad3f280e522", "itemCount": 1, "orderNumber": "ORD-20260322-0009", "customerName": "Variant Test", "customerPhone": "8888777666", "paymentMethod": "CASH"}	\N	\N	2026-03-22 04:46:41.746155+00
e7d62847-b793-48c8-8e2d-db44af40459d	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	curl/8.7.1	2026-03-22 04:46:57.076015+00
e8803644-1169-497f-a5f4-f5dbfc22cce9	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-03-23 08:40:20.247617+00
ac3e30ce-bd52-47dd-ac07-9d353183ab88	\N	LOGIN_FAILED	{"email": "admin@robustersfitness.com", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-30 13:53:55.959135+00
b84d436b-262e-41ef-b686-a278a79f82f3	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-03-30 13:54:10.032394+00
3bbf2391-c490-4db9-9531-29e67f98a495	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 120, "orderId": "e432e22c-1f64-404d-b71c-f60d84415cac", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260330-0001", "customerName": "Rupinder", "customerPhone": "8557984227", "paymentMethod": "CARD"}	\N	\N	2026-03-30 14:09:58.769458+00
76fb5de4-320d-43d8-95e1-0f1cf3c7d54e	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "3bae1580-738e-4f09-ae95-a76cc8092719", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260330-0002", "customerName": "Ratan", "customerPhone": "9888814129", "paymentMethod": "CARD"}	\N	\N	2026-03-30 14:32:23.026714+00
f74e2750-788a-4646-9fb5-a381a1cca6da	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "49b897c0-9705-4ff9-b4a7-20e401bff9b6", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260330-0003", "customerName": "Kulwinder", "customerPhone": "9888480868", "paymentMethod": "CASH"}	\N	\N	2026-03-30 14:38:22.081381+00
3ef99a35-7f28-48a4-b24e-d91e57f32af7	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 170, "orderId": "639e61ff-f700-4c90-9e2d-a21c8574172f", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260330-0004", "customerName": "Dr adithyan", "customerPhone": "6385851238", "paymentMethod": "CASH"}	\N	\N	2026-03-30 14:47:39.368883+00
4f69715d-d713-4f27-a84b-cd4d923382a1	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 140, "orderId": "b3809702-8afe-4106-ac70-985cc526e013", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260330-0005", "customerName": "Aman", "customerPhone": "7986697675", "paymentMethod": "CARD"}	\N	\N	2026-03-30 14:58:35.884543+00
9fff8661-f613-4547-b86f-5aa8b4d033d9	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "834138cf-c314-4dbb-9956-d6eb4960d1a2", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260330-0006", "customerName": "Dara", "customerPhone": "7889088227", "paymentMethod": "CASH"}	\N	\N	2026-03-30 15:17:25.553116+00
8a0120db-ca99-4c03-a7ff-d4383485ad8c	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 160, "orderId": "04894e98-8b4e-4a19-9347-07bb1b552cef", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260330-0007", "customerName": "Indin", "customerPhone": "7018912044", "paymentMethod": "CARD"}	\N	\N	2026-03-30 15:35:25.425356+00
760e6702-b6d8-41bc-bfeb-7e8416865729	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 650, "orderId": "79747488-a713-4a2b-bb61-aab2f96c109a", "itemCount": 3, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260330-0008", "customerName": "Sukhjot", "customerPhone": "9779200053", "paymentMethod": "CASH"}	\N	\N	2026-03-30 16:00:38.203247+00
3ad67643-f7d3-44b9-abdd-db670962af39	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-03-30 16:09:53.374444+00
5d060acd-ac6e-4746-980b-f0521987535e	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-03-30 16:23:01.817612+00
2b43fc04-8a3a-4284-b13c-138f08cdf74c	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 280, "orderId": "5f4137e7-2348-4ed1-8883-8f76ae555f64", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260331-0001", "customerName": "Emmie", "customerPhone": "9888833326", "paymentMethod": "CASH"}	\N	\N	2026-03-31 16:04:04.709684+00
0ab04d60-04ce-4017-b7cc-f6acad81bbd8	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-01 09:48:35.852712+00
85b44445-bc4f-4573-a9fb-9e30b8e52079	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 340, "orderId": "52b3d679-9241-49d0-a5a0-782b7d58a6f9", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0001", "customerName": "New", "customerPhone": "8968700270", "paymentMethod": "CASH"}	\N	\N	2026-04-01 09:52:12.80387+00
94c246fa-763e-4702-9aca-7f7bf51d2029	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "8250f1a3-21b4-41bb-9943-b38b4177ab19", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0002", "customerName": "sehaj", "customerPhone": "9872266265", "paymentMethod": "CARD"}	\N	\N	2026-04-01 11:32:38.843165+00
c0303be0-879a-4271-924a-5d63cb93cbe1	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 210, "orderId": "2c49fa61-eb1c-4a48-bf82-e6d978a2af6e", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0003", "customerName": "Aman", "customerPhone": "9781857530", "paymentMethod": "CASH"}	\N	\N	2026-04-01 11:58:39.885193+00
3927fa9d-a365-440c-adc6-5b9587612839	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "5855dd37-8d72-4fbc-af42-ae4173370647", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0004", "customerName": "Birinder", "customerPhone": "8727966718", "paymentMethod": "CARD"}	\N	\N	2026-04-01 12:01:25.942581+00
d4448241-730c-4c1f-a094-329239e8c23b	\N	LOGIN_FAILED	{"email": "admin@robustersfitness.com", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 12:36:02.047937+00
6af6b4f3-bc42-4efe-a574-0eff607a8098	\N	LOGIN_FAILED	{"email": "admin@robustersfitness.com", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 12:37:40.498117+00
4ce30a41-582e-43d4-9ff2-89d97d25fb16	\N	LOGIN_FAILED	{"email": "admin@robustersfitness.com", "reason": "User not found"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 12:37:49.831334+00
d9d560b0-a426-4b64-a98e-8db84f54a7f1	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-01 12:38:22.883169+00
81fc81a0-0b7d-457f-9f8c-06184ed926cd	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 12:38:52.505865+00
4a348dfa-501e-4167-ba5f-321dc9c1a006	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-01 13:12:45.601006+00
3ea16b36-e12a-4b3c-8b07-b4dd05106228	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 5250, "orderId": "4bced266-e7d9-4e0d-b836-8d40c1be7ba2", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0005", "customerName": "Archi", "customerPhone": "9316488821", "paymentMethod": "CARD"}	\N	\N	2026-04-01 13:23:35.427539+00
def838d1-5585-4653-8853-01cc22f291e8	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 480, "orderId": "38232373-65a5-42bb-b51b-98c746cbb73b", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0006", "customerName": "ryan", "customerPhone": "8882626545", "paymentMethod": "CARD"}	\N	\N	2026-04-01 13:49:07.101263+00
6d5f172c-f197-4a3a-b13e-3ea94d5e797d	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 13:55:55.16285+00
708bd4b7-ae62-4e5f-b8f7-84111032b647	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:00:56.412895+00
585f3115-ba1d-4bac-b03b-a026180025ec	217c7097-1140-4918-a56d-e6d913722541	LOGIN	{"email": "pardeep@robusters.com"}	157.39.207.95	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	2026-04-14 11:36:41.088532+00
c61b667f-e2fc-43c7-80b9-30ac12b6dd6d	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 210, "orderId": "0e15fe9a-54e0-4039-9428-922e8b4f3001", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0007", "customerName": "PUNEET", "customerPhone": "7986546791", "paymentMethod": "UPI"}	\N	\N	2026-04-01 14:05:03.228639+00
cc2a7397-f868-4cac-8bc0-ab3bcf9796fc	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:10:41.960935+00
e5d07485-a550-48c6-bec9-4fad1d2882f3	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-04-01 14:11:09.211534+00
42669453-2d9c-4576-b543-e35383044002	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-04-01 14:31:33.363893+00
9d206220-59b2-4588-98b7-b9175f5daecf	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:39:56.767209+00
8dd13bcb-4c58-4084-b593-0a3cb213d4d4	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:42:36.88334+00
48f90754-b5da-4a71-a493-3df0a49bad26	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:42:40.738224+00
7602b9c5-d4c1-4ea9-9434-c5f641eafd99	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:43:08.022594+00
2bbd8de3-afb0-4543-a8d0-5a24d9637316	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:43:11.443081+00
ca82dc16-3d56-4597-ad7d-36b426486ae1	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:46:12.65136+00
82f60ac2-6614-4e9a-b8b5-97e1ec007dc5	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:46:22.958494+00
ff1c2bd7-3111-4294-8b8f-162dd99a0702	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-01 14:46:26.411514+00
4cffc69e-d3a7-468e-b91c-40965c670a07	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "13cc6d81-de58-4ae2-b687-6de663ff378a", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0008", "customerName": "Anshul", "customerPhone": "8725033137", "paymentMethod": "CASH"}	\N	\N	2026-04-01 14:49:46.675571+00
807a198c-b1b9-4f00-a011-9b297ab702a7	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "a05560ee-4c3a-47dc-b18e-5451f2ad0722", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0009", "customerName": "m. dogra", "customerPhone": "8284804416", "paymentMethod": "CARD"}	\N	\N	2026-04-01 14:50:22.924213+00
613eaddd-712b-4873-a7e9-e27a86587912	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	38.137.49.201	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-04-01 14:52:41.994478+00
9ce534f9-1bc1-4227-8476-22fc885a5744	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.49.201	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-04-01 14:52:57.676573+00
20fbe92b-0703-4c58-ae70-30077d75d5c5	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "a77fdee5-96a6-45db-b130-3d6b2b428d13", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0010", "customerName": "Dara", "customerPhone": "7889088227", "paymentMethod": "CARD"}	\N	\N	2026-04-01 15:21:24.758284+00
81950e14-2e66-4f8f-a7ee-74b9ad8de2f7	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "925993a6-20a9-4593-ab21-3d3ee527b596", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0011", "customerName": "Dara", "customerPhone": "7889088227", "paymentMethod": "CARD"}	\N	\N	2026-04-01 15:21:33.531706+00
a442bff6-a7a5-4401-af08-e1e6a4d4a02e	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 170, "orderId": "4f186972-5762-4278-9bda-c91040959f69", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0012", "customerName": "Karan", "customerPhone": "9781989994", "paymentMethod": "CARD"}	\N	\N	2026-04-01 15:25:37.015517+00
af884ea6-53f0-4336-84c2-998426c41f67	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 210, "orderId": "a1c015c1-9a13-4039-8279-f9bfb195f51e", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0013", "customerName": "JASPREET", "customerPhone": "8872222286", "paymentMethod": "UPI"}	\N	\N	2026-04-01 15:30:20.69796+00
ce2bbeb1-257e-40c0-8d09-9adafba71cba	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	106.78.22.175	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-01 15:58:14.206921+00
451eaa48-c6de-4e82-ab18-15ce34fa2a95	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "9041c8e3-a16a-4645-8e1f-4fafa424aed4", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260401-0014", "customerName": "Akashdeep", "customerPhone": "7888835259", "paymentMethod": "CASH"}	\N	\N	2026-04-01 15:59:42.895776+00
b0be08ab-75ff-4630-909c-cb547fb60957	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 240, "orderId": "3b0872d0-d7b8-481f-8ed2-af5122f8f01c", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0001", "customerName": "ryan", "customerPhone": "8882626545", "paymentMethod": "UPI"}	\N	\N	2026-04-02 11:25:44.89822+00
05b6f6a8-f5d8-4d42-923d-b2801af8cb26	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "ed0bffdf-9f89-4130-b01e-58bfd13e0c31", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0002", "customerName": "Birinder", "customerPhone": "8727966718", "paymentMethod": "CASH"}	\N	\N	2026-04-02 11:27:21.18554+00
0eed0ffe-240b-4b88-983e-e874f4817c1b	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 240, "orderId": "83b98592-8abc-4892-ad6c-4ffe6578c4ee", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0003", "customerName": "Aman", "customerPhone": "9781857530", "paymentMethod": "CASH"}	\N	\N	2026-04-02 11:32:43.361405+00
58acc75d-f6d2-44e0-80eb-c09371bde324	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.52.252	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-02 12:30:42.143609+00
a8e0426a-c5fc-4398-83e5-b6121016e393	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 280, "orderId": "0d93aff5-3765-4ffd-b54f-7fb14515483f", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0004", "customerName": "Ubaid khan", "customerPhone": "8899048219", "paymentMethod": "CASH"}	\N	\N	2026-04-02 12:32:18.977849+00
845e54d7-a518-4120-91a1-9babb989944f	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "5d05c323-9c60-4215-8419-cbf1dbb5f70d", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0005", "customerName": "Jaspreet", "customerPhone": "9988161089", "paymentMethod": "UPI"}	\N	\N	2026-04-02 12:43:31.496355+00
2a523597-0667-4b3a-85ef-b2d01f1652f2	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 360, "orderId": "2fbe296c-4b86-4eb0-9f5a-a2457e947c21", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0006", "customerName": "Gurpreet", "customerPhone": "8427346684", "paymentMethod": "CARD"}	\N	\N	2026-04-02 14:10:04.330427+00
35fa9d30-c5e2-4226-92bd-b0c9feacef3f	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "4a55c61a-1344-48be-9ea0-99b4a370aa0d", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0007", "paymentMethod": "CASH"}	\N	\N	2026-04-02 14:12:16.171247+00
dbd9ddd4-08ee-45e8-bfec-8acc1cae203e	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 3, "orderId": "680ff6b7-8050-4f8d-b77f-272a51fdec89", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0008", "customerName": "Archi", "customerPhone": "9316488821", "paymentMethod": "CASH"}	\N	\N	2026-04-02 14:16:21.945952+00
a562f37a-5760-4160-b91b-66324320acab	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 8250, "orderId": "6a6355ee-7d57-4d17-973e-28b678cd41d1", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0009", "paymentMethod": "UPI"}	\N	\N	2026-04-02 14:19:01.916379+00
79a0dcc9-4bdc-46f4-98f8-e67203ddedc7	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CANCELLATION_REQUESTED	{"reason": "WRong order", "orderId": "6a6355ee-7d57-4d17-973e-28b678cd41d1", "orderTotal": 8250, "orderNumber": "ORD-20260402-0009", "paymentMethod": "UPI"}	\N	\N	2026-04-02 14:19:31.108662+00
eab53c7d-508b-4307-a1e4-16f33eff5734	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 3000, "orderId": "9ab49967-722a-4b57-bd10-73d91be82841", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0010", "paymentMethod": "CASH"}	\N	\N	2026-04-02 14:20:12.428845+00
3fa5dd39-8cab-40f1-87d8-bac53e597be7	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.52.252	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 14:21:33.290594+00
04fd86fd-b506-42fc-83a5-b120a9a9519b	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 14:34:54.268325+00
fef1a2b9-0666-4af6-8568-5c460d0777b4	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.49.201	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-02 14:48:03.380625+00
5ee00705-285a-42e7-a335-dff892f04da6	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "302f8c46-33ca-4255-aa06-8fd3210f23c3", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0011", "customerName": "m. dogra", "customerPhone": "8284804416", "paymentMethod": "CASH"}	\N	\N	2026-04-02 14:51:34.614245+00
fb766d59-c9c0-4400-b6d0-551eecfe458d	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 170, "orderId": "a8804faa-24eb-44df-bdd4-35f7f093105c", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0012", "customerName": "Ekam", "customerPhone": "9815994592", "paymentMethod": "UPI"}	\N	\N	2026-04-02 15:13:50.45722+00
d2eddec1-3735-423a-9dac-36b0e9e921e6	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 160, "orderId": "a5b373f7-0a55-4696-a997-b846a6b0a80b", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0013", "customerName": "Pritpal singh", "customerPhone": "8569021786", "paymentMethod": "CARD"}	\N	\N	2026-04-02 15:17:13.057812+00
7c66c3e4-8655-49fc-8351-6c673caf483d	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 300, "orderId": "d602e00b-88af-44b6-903f-4f730b58ba3c", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260402-0014", "customerName": "Dara", "customerPhone": "7889088227", "paymentMethod": "CASH"}	\N	\N	2026-04-02 15:26:33.248141+00
257f0524-c20e-489c-aee9-cf8fb3590da3	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 240, "orderId": "a3d0ade0-4593-49ab-8bc2-bbd04bb5de5c", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0001", "customerName": "ryan", "customerPhone": "8882626545", "paymentMethod": "CASH"}	\N	\N	2026-04-03 12:17:44.543257+00
ba732a40-148f-4f6f-be24-4128529c3b55	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	106.78.28.143	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-03 12:51:05.476098+00
302a593c-8841-4453-9b1e-87500d6e2925	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 210, "orderId": "dd776b42-75e2-4445-a889-ea9bbe42aa5b", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0002", "customerName": "Aman", "customerPhone": "9781857530", "paymentMethod": "UPI"}	\N	\N	2026-04-03 12:51:50.404203+00
4414c5ce-cca0-4deb-a15c-c5f757554d9e	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 440, "orderId": "046dfb35-3381-45ef-98c1-a07286b8ac71", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0003", "customerName": "Mandeep", "customerPhone": "7009562760", "paymentMethod": "UPI"}	\N	\N	2026-04-03 13:27:36.569866+00
8afd4b77-3f1a-4411-8440-9da64bda8fe8	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "683082a2-5961-456c-b433-5024a4b067ec", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0004", "customerName": "Sameer", "customerPhone": "9812550900", "paymentMethod": "CASH"}	\N	\N	2026-04-03 14:31:14.33313+00
6cfaab2d-f7e5-4383-bb3d-055e1d6a2d78	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "0d68a76b-ba86-42a1-a86e-542689fc1c49", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0005", "customerName": "m. dogra", "customerPhone": "8284804416", "paymentMethod": "CASH"}	\N	\N	2026-04-03 14:31:34.142088+00
238f9f5a-9fa7-40e1-aab8-de39cba7a310	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 170, "orderId": "3694acf1-3a15-44b9-be57-6f83c0d01db1", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0006", "customerName": "Anmol", "customerPhone": "8054638082", "paymentMethod": "UPI"}	\N	\N	2026-04-03 14:48:37.866923+00
a7e6a728-da7e-4aa1-a153-d2514719a936	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.9.204	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-03 14:49:38.159477+00
b12cc03c-c747-4e21-82db-bf0a6ad8e657	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "cdafbd1e-3e19-4daa-b552-e9de6ad603e1", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0007", "customerName": "Anmol", "customerPhone": "8054638082", "paymentMethod": "UPI"}	\N	\N	2026-04-03 14:55:19.577053+00
6731a8f3-d886-4f1f-839e-9413bb551394	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 170, "orderId": "c4db938d-ed3c-4195-badb-3292394b3195", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0008", "customerName": "Jaspreet", "customerPhone": "9988161089", "paymentMethod": "CASH"}	\N	\N	2026-04-03 14:56:08.131412+00
737d9118-094d-486b-95ed-f073844ca19b	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "833b27e6-8a48-4e20-9d72-96954f6c1bb8", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0009", "customerName": "Ajay Maan", "customerPhone": "7696343400", "paymentMethod": "CASH"}	\N	\N	2026-04-03 15:50:07.520159+00
7d4c5e35-a9f9-4d3d-90f2-cd6af0e66563	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 320, "orderId": "966af58d-bcb8-4316-a52a-930cc9dc8265", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0010", "customerName": "Shebaz", "customerPhone": "8708002661", "paymentMethod": "UPI"}	\N	\N	2026-04-03 15:59:08.731127+00
fb8c3497-23fa-49d6-aab8-1744f40733ec	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 200, "orderId": "f9719581-dbff-4864-9b21-9ae30b4806a0", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0011", "customerName": "Dara", "customerPhone": "7889088227", "paymentMethod": "UPI"}	\N	\N	2026-04-03 15:59:54.407647+00
568a5e91-5f33-4278-bdc1-e0536c569522	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 250, "orderId": "11f641a5-8b84-4ce8-bbda-610f46142d26", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0012", "customerName": "Varun", "customerPhone": "8837679312", "paymentMethod": "CASH"}	\N	\N	2026-04-03 16:24:02.556264+00
1261ecab-e7be-4640-87ee-4e0530bc5215	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 160, "orderId": "2f4666a4-e42e-4448-826e-9e9377b4215b", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0013", "paymentMethod": "CASH"}	\N	\N	2026-04-03 16:24:27.862257+00
782a40ef-10cb-4a80-823a-51cc6aa16e25	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 120, "orderId": "d2470726-537b-4201-aee5-dcb209f34122", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260403-0014", "paymentMethod": "CASH"}	\N	\N	2026-04-03 16:24:57.20276+00
13da0b02-a2d6-4c66-a3ba-6d2458214763	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.11.29	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-04 14:11:51.657166+00
93eee75d-c538-4024-8dca-743e2ff124d8	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 230, "orderId": "dd1b98cb-218b-4d77-9ebe-27d773a0f795", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260404-0001", "customerName": "Saurav", "customerPhone": "8054270064", "paymentMethod": "CASH"}	\N	\N	2026-04-04 14:12:48.50936+00
37fb21aa-1214-4ab2-bfba-93e36e79b1b4	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 640, "orderId": "8bf4561d-2dcc-4577-a247-d77bcb7a8445", "itemCount": 3, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260404-0002", "paymentMethod": "CASH"}	\N	\N	2026-04-04 14:15:48.429134+00
b023a125-ca0a-4050-889d-f41045e38775	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-04 14:25:20.686206+00
99a05215-4d93-4004-a6c2-6522d831dc8e	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-04 14:31:40.205834+00
89d8a7e2-5ecb-443a-bc00-8b67daabeda5	\N	LOGIN_FAILED	{"email": "admin@lastresort.com", "reason": "User not found"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-04 14:35:16.306538+00
d8f9f70c-8477-4767-9f11-de9925ea4c78	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-04 14:35:24.635948+00
16e01ab4-d23c-43eb-9b51-969b66317ae6	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-04 14:35:27.847126+00
81b12eef-572c-41a1-bbc9-42ab147df98a	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-04 14:35:38.365582+00
ed1f7587-9920-4af2-abaa-9b77479a06aa	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.52.140	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-04 14:49:59.246316+00
e9faa6d6-b310-40ae-a2e8-c2d4162692ef	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 480, "orderId": "0d1ad374-d94d-42cc-b0d3-289419c5b9d9", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260404-0003", "customerName": "ryan", "customerPhone": "8882626545", "paymentMethod": "CASH"}	\N	\N	2026-04-04 14:54:03.272269+00
2a7c2087-3052-44cf-bbfa-c9df45227bac	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.52.221	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-06 11:27:34.657096+00
77295d49-8c57-4843-bfbe-c8b00794f232	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 100, "orderId": "c9d7cfef-bf27-4dd6-ba94-59efc0792d36", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260406-0001", "customerName": "Birinder", "customerPhone": "8727966718", "paymentMethod": "CASH"}	\N	\N	2026-04-06 11:29:20.525841+00
a723af94-d031-4f7e-89f3-f3f09bc7f985	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 330, "orderId": "a095d6ef-c4d4-492a-86f0-1cd8ad92930b", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260406-0002", "customerName": "Lovepreet", "customerPhone": "8437068104", "paymentMethod": "UPI"}	\N	\N	2026-04-06 15:42:55.331075+00
f0b213e6-5c7c-42ec-af86-dd3eb894243a	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 240, "orderId": "c3e2c9bd-01e4-46f3-bc0d-7f1178359dab", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260406-0003", "customerName": "ryan", "customerPhone": "8882626545", "paymentMethod": "CASH"}	\N	\N	2026-04-06 15:43:52.790863+00
0a113eb8-2c67-4027-a7e4-064a24223a12	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.54.74	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-07 14:51:52.363397+00
58ef8780-83ba-47b7-8346-ff45bda504e3	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 210, "orderId": "ef75ea9c-559b-42c5-9caa-d37cbca2a6c3", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260407-0001", "customerName": "Simar", "customerPhone": "9996187544", "paymentMethod": "UPI"}	\N	\N	2026-04-07 14:52:56.014104+00
521ccbf7-9aad-49a6-b5ea-64243a2aa883	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "9f526cfa-837a-4564-beb3-d012e96de125", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260407-0002", "customerName": "Atul", "customerPhone": "9988884994", "paymentMethod": "CASH"}	\N	\N	2026-04-07 15:24:44.50673+00
6cce8fbe-43b7-4856-bc7b-952659f908be	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.51.208	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-08 13:41:01.605808+00
e6000759-3ae9-4c79-b346-de74e6baf248	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 450, "orderId": "bac9c8ef-f571-44a9-ad9d-b54aea23c7d0", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260408-0001", "customerName": "Ajay Maan", "customerPhone": "7696343400", "paymentMethod": "UPI"}	\N	\N	2026-04-08 13:41:52.280868+00
a8afc3ae-858d-49bf-9fb2-716f67d7b8cf	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 480, "orderId": "f70b297f-4dbd-47f5-a7b1-a2b8626621a1", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260408-0002", "customerName": "ryan", "customerPhone": "8882626545", "paymentMethod": "UPI"}	\N	\N	2026-04-08 13:42:18.208537+00
c1a8f36c-541d-440f-8656-db0d88a4a7c0	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 150, "orderId": "84240672-49c9-4d3d-9cfd-abe10d8dcf23", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260408-0003", "customerName": "Pardeep", "customerPhone": "8558885691", "paymentMethod": "UPI"}	\N	\N	2026-04-08 13:47:22.619157+00
047ccfe9-b9c9-4186-990a-a96c99ca592a	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN_FAILED	{"reason": "Invalid password"}	38.137.51.208	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-08 13:52:05.997781+00
e29d363d-67f6-4741-ac78-a47475725b8a	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGOUT	{"email": "admin@robusters.com"}	38.137.51.208	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-08 13:52:26.350606+00
a41b98ff-1559-41fc-a9c0-edea6c31190e	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.51.208	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-08 13:53:28.875941+00
8ce417bf-b02e-4c18-a8b4-7a9e846a8294	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.51.208	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-08 14:14:46.393947+00
51323be2-57e2-432e-839c-ee287389c3c2	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 710, "orderId": "592a7455-6591-4379-8f2f-cc5d61dbae9a", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260408-0004", "customerName": "Arsh", "customerPhone": "8872600268", "paymentMethod": "UPI"}	\N	\N	2026-04-08 14:19:30.749833+00
9df8dfbb-c24b-47b5-a9a2-8d658c14042d	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 200, "orderId": "98b7e658-1762-4cba-8dc1-018031996e79", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260408-0005", "customerName": "m. dogra", "customerPhone": "8284804416", "paymentMethod": "CASH"}	\N	\N	2026-04-08 14:46:57.095118+00
8511377d-1a67-4fb3-8ab5-3f817bd9077f	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.8.88	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	2026-04-10 11:13:42.823235+00
a68a5a17-d102-4e7c-9dec-14d0f2ab0aa0	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 380, "orderId": "2493e535-7c89-4a7a-abdb-97ff4f251a23", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260410-0001", "customerName": "Suchsum", "customerPhone": "9316655228", "paymentMethod": "CASH"}	\N	\N	2026-04-10 11:14:58.528312+00
399aaa60-c390-456f-9ca2-c389574b8293	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.8.88	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-10 11:38:03.313012+00
95683aa8-511f-4791-8eb7-c45d282f8965	d901cbdb-101b-49e3-a421-4d01a572b77a	USER_CREATED	{"createdUserId": "217c7097-1140-4918-a56d-e6d913722541", "createdUserRole": "MANAGER", "createdUserEmail": "pardeep@robusters.com"}	38.183.8.88	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-10 11:40:02.089664+00
8246a610-672e-4cc6-80d3-8d45df4122ab	217c7097-1140-4918-a56d-e6d913722541	LOGIN	{"email": "pardeep@robusters.com"}	157.39.204.180	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	2026-04-10 11:44:12.392894+00
8badc382-0c94-43c9-b3b5-fb74c1cd340b	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 130, "orderId": "03d3f07b-33fb-4f6b-8b10-3bac630f5c38", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260410-0002", "customerName": "Ajay Maan", "customerPhone": "7696343400", "paymentMethod": "CASH"}	\N	\N	2026-04-10 12:43:52.909039+00
cb277145-ba49-4412-97fd-be91448baba4	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 210, "orderId": "112c79fa-1131-49e2-bdea-63964eaea10d", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260410-0003", "customerName": "Aman", "customerPhone": "9781857530", "paymentMethod": "UPI"}	\N	\N	2026-04-10 12:44:51.223731+00
184d3a5d-9ded-4e54-989a-9ae8c930b291	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 310, "orderId": "912cec58-ea2c-4833-a82a-48fb3e0281d2", "itemCount": 3, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260410-0004", "customerName": "Saurav", "customerPhone": "8219444491", "paymentMethod": "UPI"}	\N	\N	2026-04-10 13:21:59.157075+00
f0132cb9-d62c-455d-bbca-e80f793d64e0	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "d81e75a6-d8ac-4941-a402-41946eeca960", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260410-0005", "customerName": "Sameer", "customerPhone": "9812550900", "paymentMethod": "CASH"}	\N	\N	2026-04-10 13:24:27.102898+00
c0466270-049d-47f1-ae2a-b155de5dfd09	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 160, "orderId": "ca3f75e1-765f-4fc9-9d2f-d6a8fe95285d", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260410-0006", "customerName": "Manraz", "customerPhone": "9872076307", "paymentMethod": "UPI"}	\N	\N	2026-04-10 13:39:26.519773+00
e393f75c-b04a-4f85-b93a-e80c4ef0cbe5	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 170, "orderId": "efc475c6-522d-4fd5-8c00-c8762e0e345e", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260410-0007", "customerName": "Garry", "customerPhone": "6280565949", "paymentMethod": "CASH"}	\N	\N	2026-04-10 13:44:33.556266+00
e15d7044-8097-4d46-a51e-7982996e64c0	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 200, "orderId": "0ffd995b-ced2-4b7c-9593-ce41234dbb00", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260410-0008", "customerName": "m. dogra", "customerPhone": "8284804416", "paymentMethod": "UPI"}	\N	\N	2026-04-10 14:39:30.438542+00
ad85c4dc-2990-4bb0-bba2-38e095920484	217c7097-1140-4918-a56d-e6d913722541	LOGIN	{"email": "pardeep@robusters.com"}	157.39.198.136	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	2026-04-11 15:24:54.457839+00
71694a1d-b8bc-41d3-9736-c649bfc920c2	217c7097-1140-4918-a56d-e6d913722541	LOGIN	{"email": "pardeep@robusters.com"}	157.39.215.74	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	2026-04-13 06:23:15.663932+00
7e11a53f-add0-40f5-99d8-9ec7792283cc	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.52.196	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.47 Mobile/15E148 Safari/604.1	2026-04-13 15:12:06.232729+00
d61a6312-e3d7-4e77-bd4e-4bd37f71ecf5	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "42f36d7d-78dc-46aa-a31f-b9bcd7a17392", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260413-0001", "customerName": "Sameer", "customerPhone": "9812550900", "paymentMethod": "CASH"}	\N	\N	2026-04-13 15:12:47.807406+00
99f4c1a5-02ab-4069-b4fa-d1d8978183cc	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.52.196	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.47 Mobile/15E148 Safari/604.1	2026-04-13 15:40:47.747318+00
b5e29bc9-60ba-4562-89b8-c91fd6f3c4a3	217c7097-1140-4918-a56d-e6d913722541	ORDER_CREATED	{"total": 440, "orderId": "5bd102b1-0bf3-4084-902d-817c86d6fb1d", "itemCount": 3, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260414-0001", "customerName": "Deepak", "customerPhone": "8295241212", "paymentMethod": "UPI"}	\N	\N	2026-04-14 11:40:09.156057+00
f2b3d1b5-56fc-412e-9d30-49c3fc8f67c9	217c7097-1140-4918-a56d-e6d913722541	LOGIN	{"email": "pardeep@robusters.com"}	157.39.207.95	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	2026-04-14 15:29:18.482627+00
e3188206-edea-47a0-82f0-07df7230a5b0	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.11.56	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	2026-04-15 11:18:54.711954+00
248638e1-589c-497a-bb05-8642d27be775	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.11.56	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.47 Mobile/15E148 Safari/604.1	2026-04-15 14:02:15.45238+00
6fd0f9e8-8ebf-4d09-a141-49fa0d217609	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 560, "orderId": "cb290522-49d9-487f-869a-604d24e0bfb8", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260415-0001", "customerName": "Deepak", "customerPhone": "9815687899", "paymentMethod": "CASH"}	\N	\N	2026-04-15 14:03:25.632393+00
f688808b-dcd4-484c-8824-93e4a83105c0	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 270, "orderId": "dbe57516-4206-44f9-a795-151a30b4118e", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260415-0002", "customerName": "Ashneet", "customerPhone": "7814346557", "paymentMethod": "CASH"}	\N	\N	2026-04-15 14:05:17.18565+00
d2238572-4dd3-42bd-8cca-3fdb7cff4441	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.11.56	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.47 Mobile/15E148 Safari/604.1	2026-04-15 14:26:21.676844+00
bc2368e3-ce9d-4670-b88d-790af547192f	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 210, "orderId": "490902f5-449e-4158-8533-e8dd5a2f1c19", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260415-0003", "customerName": "m. dogra", "customerPhone": "8284804416", "paymentMethod": "CASH"}	\N	\N	2026-04-15 14:40:42.445673+00
69af7f27-e838-464c-a1b1-6704e2faa2bf	217c7097-1140-4918-a56d-e6d913722541	LOGIN	{"email": "pardeep@robusters.com"}	157.39.207.68	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	2026-04-16 10:33:20.843799+00
750ecd66-f4c5-4860-8752-983a2f2c0c6e	217c7097-1140-4918-a56d-e6d913722541	ORDER_CREATED	{"total": 300, "orderId": "6e6830b6-932d-4bec-9fe6-38c62a8ea7e4", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260416-0001", "customerName": "Vaibhav", "customerPhone": "8360659942", "paymentMethod": "CASH"}	\N	\N	2026-04-16 10:37:20.950962+00
22eac34c-6e6a-44f7-91db-d320ed4e4798	217c7097-1140-4918-a56d-e6d913722541	ORDER_CREATED	{"total": 160, "orderId": "41c0d93a-60ef-464f-910e-9b215096771a", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260416-0002", "customerName": "Harsh Kumar", "customerPhone": "8684048182", "paymentMethod": "CASH"}	\N	\N	2026-04-16 10:42:17.125763+00
a2801c29-e2be-4363-bb56-3a5f67846db6	217c7097-1140-4918-a56d-e6d913722541	ORDER_CREATED	{"total": 430, "orderId": "fa9d9873-449e-4d9f-a77b-51321293d8a9", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260416-0003", "customerName": "Aaditya", "customerPhone": "9877229862", "paymentMethod": "CASH"}	\N	\N	2026-04-16 10:44:41.844556+00
089e7365-a188-4998-a390-bdf978f6d6e3	217c7097-1140-4918-a56d-e6d913722541	ORDER_CREATED	{"total": 310, "orderId": "8bccaeb3-2dd7-4acd-98ac-15549f128095", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260416-0004", "customerName": "Sarabjeet", "customerPhone": "8559020323", "paymentMethod": "CASH"}	\N	\N	2026-04-16 10:47:25.964291+00
7dffda83-21b3-4cdd-8629-cfa771e9a415	217c7097-1140-4918-a56d-e6d913722541	ORDER_CREATED	{"total": 5250, "orderId": "c8454b9c-de39-4ba4-8b97-e08ba0794c11", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260416-0005", "customerName": "Malkiat Singh", "customerPhone": "9501758111", "paymentMethod": "CASH"}	\N	\N	2026-04-16 10:51:56.607067+00
3181de70-b270-4c9a-9db7-56d7200100e2	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.8.122	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.47 Mobile/15E148 Safari/604.1	2026-04-16 13:49:54.468988+00
5b9c8fd4-8c74-452e-915f-81bba9ab99a8	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "d3555aed-65f7-44c2-a980-98c736a97d20", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260416-0006", "customerName": "Karan", "customerPhone": "9988192271", "paymentMethod": "CASH"}	\N	\N	2026-04-16 13:51:02.597125+00
336d2597-4d12-4018-84aa-f5dfd8bacb7d	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.49.31	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.99 Mobile/15E148 Safari/604.1	2026-04-20 13:19:03.99576+00
9cfaf9e0-9881-4111-bd95-6dfc2117aba9	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 180, "orderId": "54f2cb3e-a2ce-44ff-8d0f-a1e4298dc4cf", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260420-0001", "customerName": "Divjot", "customerPhone": "9872892308", "paymentMethod": "CASH"}	\N	\N	2026-04-20 13:19:56.56561+00
23c79008-9acb-405d-a7be-dbcca06dfcc9	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.137.49.31	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.99 Mobile/15E148 Safari/604.1	2026-04-20 13:50:20.854491+00
5b32eb8a-c325-446f-a26d-010a397acc0d	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.9.77	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.99 Mobile/15E148 Safari/604.1	2026-04-21 15:29:36.580895+00
ee859989-f742-4e49-b8c8-f7b3c822cfe9	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 450, "orderId": "369b1e53-9eda-41ba-8884-0a8b0f2b16f4", "itemCount": 2, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260421-0001", "customerName": "Anmol", "customerPhone": "8054638082", "paymentMethod": "UPI"}	\N	\N	2026-04-21 15:30:32.088395+00
46845222-5434-4dd5-8bc0-bd02269cf949	d901cbdb-101b-49e3-a421-4d01a572b77a	LOGIN	{"email": "admin@robusters.com"}	38.183.9.77	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.99 Mobile/15E148 Safari/604.1	2026-04-21 16:02:11.460449+00
05aa0e39-d08b-4c58-8e55-9b1ef9b0fdfd	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 240, "orderId": "7b29440d-0ab4-4602-8794-bc72c2d011d1", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260421-0002", "customerName": "ryan", "customerPhone": "8882626545", "paymentMethod": "CASH"}	\N	\N	2026-04-21 16:03:01.762735+00
829dce93-3fdf-45e9-9347-8fe25c40b768	d901cbdb-101b-49e3-a421-4d01a572b77a	ORDER_CREATED	{"total": 240, "orderId": "eb38d077-8f6d-43bd-ad1a-04b1ef781057", "itemCount": 1, "locationId": "c61a3558-f8dd-40d3-902c-9a0a6c234997", "orderNumber": "ORD-20260422-0001", "customerName": "ryan", "customerPhone": "8882626545", "paymentMethod": "CASH"}	\N	\N	2026-04-22 14:44:19.630267+00
\.


--
-- Data for Name: addons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.addons (id, name, slug, description, price, unit, unit_quantity, calories, protein_grams, addon_group, display_order, is_available, created_at, updated_at) FROM stdin;
b89e2194-097d-48a5-904f-4f4bdc4e263e	Mixed Beans	mixed-beans	\N	50.00	100g	100.00	\N	\N	proteins	0	t	2026-01-26 10:07:50.393883+00	2026-01-26 10:07:50.393883+00
38923adb-b42c-4264-887b-e106502074cf	Quinoa	quinoa	\N	60.00	100g	100.00	\N	\N	carbs	1	t	2026-01-26 10:07:50.658152+00	2026-01-26 10:07:50.658152+00
64506ff5-2d39-4351-8509-61eb3a51e28a	Brown Rice	brown-rice	\N	40.00	100g	100.00	\N	\N	carbs	2	t	2026-01-26 10:07:51.004453+00	2026-01-26 10:07:51.004453+00
0b5e995a-fea1-415e-a076-ecf2e047758c	Egg	egg	\N	15.00	piece	\N	\N	\N	proteins	3	t	2026-01-26 10:07:51.314743+00	2026-01-26 10:07:51.314743+00
7eaeb0fc-edad-4922-9573-e1a2573d5a7c	100G Chk Breast	100g-chk-breast	\N	100.00	100g	100.00	\N	\N	proteins	4	t	2026-01-26 10:07:51.587603+00	2026-01-26 10:07:51.587603+00
10736cd6-2240-4908-9404-0b0534d18013	100G Cottage Cheese	100g-cottage-cheese	\N	80.00	100g	100.00	\N	\N	proteins	5	t	2026-01-26 10:07:51.928171+00	2026-01-26 10:07:51.928171+00
e2bedc20-a434-4f2e-8966-239df172fcca	Tofu	tofu	\N	50.00	100g	100.00	\N	\N	proteins	6	t	2026-01-26 10:07:52.24723+00	2026-01-26 10:07:52.24723+00
175f22f0-9cdd-45be-aeae-b05aa27fe1fe	Grilled Paneer	grilled-paneer	\N	100.00	100g	100.00	\N	\N	proteins	7	t	2026-01-26 10:07:52.546428+00	2026-01-26 10:07:52.546428+00
6351ed10-7955-4877-bc1b-d2400b7eb799	Boiled Egg	boiled-egg	\N	15.00	piece	\N	\N	\N	proteins	8	t	2026-01-26 10:07:52.877109+00	2026-01-26 10:07:52.877109+00
5997e9e8-ca1f-489b-bdda-c91809d9d0de	Sunny Side Up Egg	sunny-side-up-egg	\N	30.00	piece	\N	\N	\N	proteins	9	t	2026-01-26 10:07:53.155328+00	2026-01-26 10:07:53.155328+00
0af4caff-895a-46fc-97a9-f25313022157	Steamed Chk Breast	steamed-chk-breast	\N	80.00	100g	100.00	\N	\N	proteins	10	t	2026-01-26 10:07:53.469235+00	2026-01-26 10:07:53.469235+00
3a1f599a-75e5-422f-ac44-68ed900fa85d	Grilled Chk Breast	grilled-chk-breast	\N	110.00	100g	100.00	\N	\N	proteins	11	t	2026-01-26 10:07:53.747859+00	2026-01-26 10:07:53.747859+00
a0b80ae2-024e-44b8-b4ea-a2657bf5eca2	Grilled Chk Thigh	grilled-chk-thigh	\N	130.00	100g	100.00	\N	\N	proteins	12	t	2026-01-26 10:07:54.036382+00	2026-01-26 10:07:54.036382+00
6aa1e12e-a09c-4dbc-99da-81351dd99830	Grilled Fish	grilled-fish	\N	150.00	100g	100.00	\N	\N	proteins	13	t	2026-01-26 10:07:54.383891+00	2026-01-26 10:07:54.383891+00
f659c1b9-6715-4070-9541-28fed97e4205	Small Salad	small-salad	\N	80.00	serving	\N	\N	\N	salads	14	t	2026-01-26 10:07:54.696698+00	2026-01-26 10:07:54.696698+00
eb80f037-ca5b-4bc6-8e76-dfa0f1537b05	Medium Salad	medium-salad	\N	160.00	serving	\N	\N	\N	salads	15	t	2026-01-26 10:07:55.022215+00	2026-01-26 10:07:55.022215+00
7002bce5-5f71-448f-b954-1f6319039b46	Large Salad	large-salad	\N	200.00	serving	\N	\N	\N	salads	16	t	2026-01-26 10:07:55.285908+00	2026-01-26 10:07:55.285908+00
deadae0b-4680-470d-a3c8-b551b4df4331	Extra Broccoli	extra-broccoli	\N	50.00	serving	\N	\N	\N	extras	17	t	2026-01-26 10:07:55.560754+00	2026-01-26 10:07:55.560754+00
7f7af2ae-3967-417d-bf20-ecac084f0a54	Olive Oil and Lemon Dressing	olive-oil-and-lemon-dressing	\N	40.00	serving	\N	\N	\N	dressings	18	t	2026-01-26 10:07:55.820768+00	2026-01-26 10:07:55.820768+00
aaa55a11-ab9c-445f-80bf-11c09ac6ef8c	Coriander Dressing	coriander-dressing	\N	50.00	serving	\N	\N	\N	dressings	19	t	2026-01-26 10:07:56.080756+00	2026-01-26 10:07:56.080756+00
57dd6b6b-db16-4830-b74f-a3cc2553993a	Lemon Dressing	lemon-dressing	\N	20.00	serving	\N	\N	\N	dressings	20	t	2026-01-26 10:07:56.434755+00	2026-01-26 10:07:56.434755+00
09643902-abf7-41f4-b629-67112e06d764	Teriyaki Dressing	teriyaki-dressing	\N	50.00	serving	\N	\N	\N	dressings	21	t	2026-01-26 10:07:56.69811+00	2026-01-26 10:07:56.69811+00
0cc84220-766a-48c3-80ec-b660971aa7b6	Asian Ginger Dressing	asian-ginger-dressing	\N	80.00	serving	\N	\N	\N	dressings	22	t	2026-01-26 10:07:56.961089+00	2026-01-26 10:07:56.961089+00
50900765-4f52-4ff1-98a3-f80c64dacc8b	Vinaigrette Dressing	vinaigrette-dressing	\N	40.00	serving	\N	\N	\N	dressings	23	t	2026-01-26 10:07:57.251229+00	2026-01-26 10:07:57.251229+00
3c5f2261-6340-45a7-b488-c5a6705c45af	Mediterranean Dressing	mediterranean-dressing	\N	40.00	serving	\N	\N	\N	dressings	24	t	2026-01-26 10:07:57.563868+00	2026-01-26 10:07:57.563868+00
de12797f-97e2-4a2b-80d5-2b36c3eaabbd	Single Dip	single-dip	\N	15.00	serving	\N	\N	\N	dressings	25	t	2026-01-26 10:07:57.880301+00	2026-01-26 10:07:57.880301+00
2d5b6da6-44d3-4bd7-9507-67909f124caf	Three Sauce Dressing	three-sauce-dressing	\N	40.00	serving	\N	\N	\N	dressings	26	t	2026-01-26 10:07:58.176669+00	2026-01-26 10:07:58.176669+00
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, description, image_url, display_order, is_active, created_at, updated_at) FROM stdin;
889427de-fb27-4ec3-b9f0-004816c8bc24	High Protein Meals	high-protein-meals	Salads with your choice of protein source. Adjust portion size based on your daily protein intake.	\N	1	t	2026-01-26 10:06:33.322042+00	2026-01-26 10:06:33.322042+00
d9de46e4-2398-460a-9f93-a78745e65e79	Protein Bowls	protein-bowls	High protein bowls with moderate salad.	\N	2	t	2026-01-26 10:06:33.59901+00	2026-01-26 10:06:33.59901+00
f8900ff3-c9f8-4227-86a0-e71f8cb682d7	Burrito Bowls	burrito-bowls	Hearty burrito bowls packed with protein.	\N	3	t	2026-01-26 10:06:33.873651+00	2026-01-26 10:06:33.873651+00
42aaf135-fc57-4a36-a3a8-4f13da2b5aab	Quinoa Bowls	quinoa-bowls	Quinoa-based bowls for clean carbs and protein.	\N	4	t	2026-01-26 10:06:34.209577+00	2026-01-26 10:06:34.209577+00
5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	High Protein & Carb Meals	high-protein-carb-meals	Packed with 150g of protein source and 120g of clean carbs.	\N	5	t	2026-01-26 10:06:34.471639+00	2026-01-26 10:06:34.471639+00
10023351-9ecb-4e74-98c5-bbcd38154afb	High Fiber Salads	high-fiber-salads	Packed with natural fiber for better gut health.	\N	6	t	2026-01-26 10:06:34.825106+00	2026-01-26 10:06:34.825106+00
955bcbfd-9c78-4992-b5ca-dd82e66e1edb	Eggetarian	eggetarian	Egg-based dishes for protein lovers.	\N	7	t	2026-01-26 10:06:35.095925+00	2026-01-26 10:06:35.095925+00
52809bbb-53da-45e3-9abf-faa01fbd347b	Indian Style Bowls	indian-style-bowls	Zero oil, no added fat. Mildly spiced with authentic Indian flavors.	\N	8	t	2026-01-26 10:06:35.361114+00	2026-01-26 10:06:35.361114+00
db65a2de-9eb7-4e80-90f5-8a093748ba6c	Healthy Stack	healthy-stack	100% wheat wraps, submarines, and grilled sandwiches.	\N	9	t	2026-01-26 10:06:35.624757+00	2026-01-26 10:06:35.624757+00
21e9ffa4-7486-4c76-a92f-dcb3fa19223b	Guilt Free Diet	guilt-free-diet	Whole wheat pasta, spaghetti, and rice noodles with veggies.	\N	10	t	2026-01-26 10:06:35.889625+00	2026-01-26 10:06:35.889625+00
7bdd4b71-0c74-4923-b43f-d890d7c205e0	New Additions	new-additions	Fresh additions to our menu.	\N	11	t	2026-01-26 10:06:36.153464+00	2026-01-26 10:06:36.153464+00
364e3366-57b2-4dfa-8203-a7f166deb620	Drinks	drinks	100% natural juices, smoothies, and low cal chillers.	\N	12	t	2026-01-26 10:06:36.419819+00	2026-01-26 10:06:36.419819+00
284f4e8b-aec6-4856-a97b-b6e5d8f99e16	Make Your Meal	make-your-meal	Your meal, your way. Choose what you love, pay for what you pick.	\N	13	t	2026-01-26 10:06:36.681649+00	2026-01-26 10:06:36.681649+00
152c2b97-2c26-415f-8ab7-587d4a6b4b6d	MEAL PACKAGES	meal-packages		\N	0	t	2026-04-01 14:00:46.794941+00	2026-04-01 14:00:46.794941+00
\.


--
-- Data for Name: category_addons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.category_addons (id, category_id, addon_id, price_override, display_order, is_active, created_at) FROM stdin;
cb9902e6-6ce7-42df-a9ec-80a25c20e7fd	889427de-fb27-4ec3-b9f0-004816c8bc24	b89e2194-097d-48a5-904f-4f4bdc4e263e	\N	0	t	2026-01-26 10:07:58.481869+00
6499bc8c-af82-4910-a3c7-792a7729ea3d	889427de-fb27-4ec3-b9f0-004816c8bc24	38923adb-b42c-4264-887b-e106502074cf	\N	0	t	2026-01-26 10:07:58.788931+00
94c39c27-007b-44e4-a569-3a91ed9c5154	889427de-fb27-4ec3-b9f0-004816c8bc24	64506ff5-2d39-4351-8509-61eb3a51e28a	\N	0	t	2026-01-26 10:07:59.095737+00
43298b5e-3a03-47d4-b441-a80be7aed54f	889427de-fb27-4ec3-b9f0-004816c8bc24	0b5e995a-fea1-415e-a076-ecf2e047758c	\N	0	t	2026-01-26 10:07:59.403456+00
5c7ac779-212e-4f7d-82e2-915a5e5e69e0	21e9ffa4-7486-4c76-a92f-dcb3fa19223b	7eaeb0fc-edad-4922-9573-e1a2573d5a7c	\N	0	t	2026-01-26 10:07:59.665082+00
d4df24c2-8ada-42be-b401-75bebed5cc78	21e9ffa4-7486-4c76-a92f-dcb3fa19223b	10736cd6-2240-4908-9404-0b0534d18013	\N	0	t	2026-01-26 10:07:59.925295+00
09064730-8490-46df-81ed-f31dae0ef7ed	21e9ffa4-7486-4c76-a92f-dcb3fa19223b	0b5e995a-fea1-415e-a076-ecf2e047758c	\N	0	t	2026-01-26 10:08:00.197544+00
78911ff2-96fb-4e70-8749-595c980eee04	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	e2bedc20-a434-4f2e-8966-239df172fcca	\N	0	t	2026-01-26 10:08:00.459739+00
f6d7892e-b65d-4fdf-9010-5f2b2ac93c5c	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	b89e2194-097d-48a5-904f-4f4bdc4e263e	\N	0	t	2026-01-26 10:08:00.721185+00
a67c547f-1c1e-49e1-9840-07e9d3993b2a	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	175f22f0-9cdd-45be-aeae-b05aa27fe1fe	\N	0	t	2026-01-26 10:08:00.98138+00
034146ed-f21c-4adb-9834-3ccadf021c69	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	6351ed10-7955-4877-bc1b-d2400b7eb799	\N	0	t	2026-01-26 10:08:01.260744+00
21d73045-932d-4050-b395-371353c6d5d7	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	5997e9e8-ca1f-489b-bdda-c91809d9d0de	\N	0	t	2026-01-26 10:08:01.525769+00
2801bd46-b925-44e0-bf59-685cdebd7bb3	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	0af4caff-895a-46fc-97a9-f25313022157	\N	0	t	2026-01-26 10:08:01.860201+00
b8487b6d-3518-45b3-b137-bc427c0aedeb	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	3a1f599a-75e5-422f-ac44-68ed900fa85d	\N	0	t	2026-01-26 10:08:02.121123+00
8a02f00d-84f6-459a-acf5-ae47b768bf51	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	a0b80ae2-024e-44b8-b4ea-a2657bf5eca2	\N	0	t	2026-01-26 10:08:02.395709+00
7b455642-8fee-43cf-8922-d39f693c25e8	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	6aa1e12e-a09c-4dbc-99da-81351dd99830	\N	0	t	2026-01-26 10:08:02.656325+00
b442044d-a8f1-423c-b955-7c3a03c7ac0e	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	f659c1b9-6715-4070-9541-28fed97e4205	\N	0	t	2026-01-26 10:08:03.005144+00
d2c0cf10-5633-4f0b-b606-9767fe99affc	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	eb80f037-ca5b-4bc6-8e76-dfa0f1537b05	\N	0	t	2026-01-26 10:08:03.297802+00
c5bb820c-683e-498e-842e-8756159794c4	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	7002bce5-5f71-448f-b954-1f6319039b46	\N	0	t	2026-01-26 10:08:03.610448+00
35b5e56a-92cb-4590-ba98-34c42e78e4bb	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	deadae0b-4680-470d-a3c8-b551b4df4331	\N	0	t	2026-01-26 10:08:03.913711+00
cfd88d58-2371-44f6-9885-b3dfea2588cc	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	38923adb-b42c-4264-887b-e106502074cf	\N	0	t	2026-01-26 10:08:04.216929+00
94093c91-88ca-4f26-a294-633636336be9	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	64506ff5-2d39-4351-8509-61eb3a51e28a	\N	0	t	2026-01-26 10:08:04.525465+00
761c3663-8527-4534-9fbb-2d4e478d94b9	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	7f7af2ae-3967-417d-bf20-ecac084f0a54	\N	0	t	2026-01-26 10:08:04.7861+00
3ad4ed78-f88a-4c7d-ad22-b6b4e0050ca3	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	aaa55a11-ab9c-445f-80bf-11c09ac6ef8c	\N	0	t	2026-01-26 10:08:05.138338+00
975f21ee-1454-481d-84c5-39260ad13487	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	57dd6b6b-db16-4830-b74f-a3cc2553993a	\N	0	t	2026-01-26 10:08:05.447365+00
081ee3ce-758e-4320-be6c-3e9b912ee59a	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	09643902-abf7-41f4-b629-67112e06d764	\N	0	t	2026-01-26 10:08:05.705506+00
5dba5827-6372-41ae-ad47-bb9f2ac9535d	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	0cc84220-766a-48c3-80ec-b660971aa7b6	\N	0	t	2026-01-26 10:08:06.057+00
d87d2d28-8424-4a20-b5f6-41d1e9e006e5	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	50900765-4f52-4ff1-98a3-f80c64dacc8b	\N	0	t	2026-01-26 10:08:06.367438+00
8d3ec214-eca9-4116-abbe-6b81dcfae74c	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	3c5f2261-6340-45a7-b488-c5a6705c45af	\N	0	t	2026-01-26 10:08:06.673921+00
ee09e14c-18a9-4d90-bbb0-a67293b81a13	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	de12797f-97e2-4a2b-80d5-2b36c3eaabbd	\N	0	t	2026-01-26 10:08:06.979092+00
3858c4c7-1ab3-4fd6-a8c9-a22cf18a75ef	284f4e8b-aec6-4856-a97b-b6e5d8f99e16	2d5b6da6-44d3-4bd7-9507-67909f124caf	\N	0	t	2026-01-26 10:08:07.287991+00
8b5b6ddd-8775-4997-82c9-f7ee584ef2a1	889427de-fb27-4ec3-b9f0-004816c8bc24	7f7af2ae-3967-417d-bf20-ecac084f0a54	\N	0	t	2026-01-27 07:46:27.060403+00
5e02e062-d95a-4f1d-81a4-ca14b35a3bf8	d9de46e4-2398-460a-9f93-a78745e65e79	64506ff5-2d39-4351-8509-61eb3a51e28a	\N	0	t	2026-01-31 06:30:13.287879+00
f39e559a-fcac-42bd-ab76-295810da7e95	d9de46e4-2398-460a-9f93-a78745e65e79	38923adb-b42c-4264-887b-e106502074cf	\N	0	t	2026-01-31 06:30:16.754647+00
b7830785-c5d1-46fe-b605-f88598b62529	d9de46e4-2398-460a-9f93-a78745e65e79	deadae0b-4680-470d-a3c8-b551b4df4331	\N	0	t	2026-01-31 06:30:23.82007+00
\.


--
-- Data for Name: customer_meal_packages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_meal_packages (id, customer_id, package_id, total_meals, consumed_meals, package_price, amount_paid, payment_status, starts_at, expires_at, status, assigned_by, assigned_at, completed_at, cancelled_at, cancellation_reason, notes, created_at, updated_at) FROM stdin;
75f3eeeb-ac02-4230-8fc1-d5fdac02ed76	a5fee63d-540c-45a6-a2b5-888948a3ccda	972d8e18-a4dd-45cf-b6a9-52ef4d1564a8	30	0	2999.99	2000.00	partial	2026-01-15	2026-02-15	active	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:04:41.65833+00	\N	\N	\N	Onboarded existing offline customer. 10 meals already consumed (updated manually).	2026-01-31 13:04:41.65833+00	2026-01-31 13:04:54.526075+00
e0df62af-b012-4d2a-bc27-d836bf1648a4	a5fee63d-540c-45a6-a2b5-888948a3ccda	637ea375-e523-47da-9037-badcead90226	60	15	5499.99	5499.99	paid	2026-01-01	2026-03-01	active	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:06:12.819601+00	\N	\N	\N	Migrated from offline system. Customer had 60 meals, consumed 15, remaining 45.	2026-01-31 13:06:12.819601+00	2026-01-31 13:06:12.819601+00
3e666d06-d0da-4266-8310-04ff543585be	bdd9e4b9-0f6b-4b08-9bc3-d08476741a34	637ea375-e523-47da-9037-badcead90226	60	0	5499.99	5499.99	paid	2026-01-31	2026-03-31	active	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:31:43.328576+00	\N	\N	\N	\N	2026-01-31 13:31:43.328576+00	2026-01-31 13:31:43.328576+00
\.


--
-- Data for Name: customer_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_orders (id, customer_id, order_id, created_at) FROM stdin;
77a76526-9a6d-46cd-bf59-8903097c00f1	d907c673-e5e0-493c-b33d-703965de87a3	02fed924-2242-46b2-8942-741b83de6046	2026-01-28 05:31:41.634918+00
9ae687fd-1199-43e8-8a64-fdfc83f73bd6	d907c673-e5e0-493c-b33d-703965de87a3	a045359f-8520-4b13-9b96-570ad8bf6b47	2026-01-28 07:49:57.518169+00
21721084-fb76-4769-8cca-16d9e0a9e6f2	d907c673-e5e0-493c-b33d-703965de87a3	e2cf503a-e24d-4532-85fe-4a0c15fc3710	2026-01-28 11:16:48.120184+00
66dd7757-522e-4241-b854-5d4896fb7d43	d907c673-e5e0-493c-b33d-703965de87a3	4968276b-4599-47de-9857-6e2eabec45e5	2026-01-28 15:33:35.825498+00
409960a4-08ca-4aa2-80ee-6181c1a4e0b2	d907c673-e5e0-493c-b33d-703965de87a3	21873951-1b2b-4a5b-94bd-8985fcc068e2	2026-01-29 09:49:33.389338+00
8c56e282-ed00-4249-830c-0321676fb806	d907c673-e5e0-493c-b33d-703965de87a3	932a1c81-31eb-455c-bfba-7eb53809a3f5	2026-01-29 10:22:56.52487+00
1bc9430e-4e96-4659-ab9b-61c462c89104	d907c673-e5e0-493c-b33d-703965de87a3	832ac525-301b-4b8a-b11d-55072e590990	2026-01-29 10:30:15.881786+00
9bfe0e66-33a9-4b28-a779-360da7ce7147	6f6f994e-86de-4fdc-9e55-5ab735f9a70f	c757661e-fd5d-41d6-b11e-f0e61d91dea8	2026-01-29 14:49:30.395047+00
a6732c77-8f7d-49e6-9303-cfd28df19f56	d907c673-e5e0-493c-b33d-703965de87a3	d4677573-f230-4b06-a5a6-f78a46cf21d9	2026-01-30 06:52:42.723453+00
4c940831-489b-48b3-ba18-aa39a13717ef	d907c673-e5e0-493c-b33d-703965de87a3	f6563197-987a-409b-a82c-b30382ea76e6	2026-01-30 07:52:18.077088+00
2c58eef0-c9e4-4a4d-9ac7-165c724b6f51	d907c673-e5e0-493c-b33d-703965de87a3	7668b1b6-8878-476e-9f8c-71863b4ee3a6	2026-01-31 09:56:15.574098+00
c73e3e5d-6253-4e3d-a16e-952b580f86fc	d907c673-e5e0-493c-b33d-703965de87a3	7303a07d-a7d1-41ee-9aa3-53ba013e1518	2026-02-04 06:21:31.96072+00
c0c001a7-4993-42ab-8b90-3a1371eb09fe	bdd9e4b9-0f6b-4b08-9bc3-d08476741a34	505b4403-92ad-4491-802a-6bf935682f45	2026-03-22 04:44:23.997461+00
7fe9bb17-e03f-46bd-90e0-0e5dae7605c9	5abbc086-3cef-441e-9737-8296223ba6ba	a27d37d1-f82c-4d8c-8322-518a1c46fa0d	2026-03-22 04:44:52.100732+00
6bd03b9f-aff6-425e-bae9-2e21bae05dd7	696327c6-aa78-4964-8279-14bc4cf749fd	ff28bf75-337e-4930-b457-e2d0eab57ece	2026-03-22 04:44:53.044324+00
3b08e277-dec9-4188-ab36-3d2b6d201022	2e30c0c3-5c65-435a-aca6-76f861bdbbf7	14440137-ef6f-40ad-a214-b48c072faf47	2026-03-22 04:44:53.126342+00
6fc38540-7333-40bb-b6e7-8b34cc7e6939	0d2cbb2a-136b-440c-a15b-5e530da76170	c7c06c18-5f03-4783-b878-d116deb207ba	2026-03-22 04:44:53.706738+00
2f474858-22ba-4513-a0dc-94e1fc9fb818	573ec462-8ead-466f-a399-178b2dae1f51	b1717c91-6237-4c02-ac58-f993ec26b7f7	2026-03-22 04:44:53.91382+00
837cb208-ce8a-4995-8ff7-984c9bb1f87d	9ee020d3-7439-4061-a731-412165cc473e	b25993bf-eaea-477a-9e3b-b04892cfbd71	2026-03-22 04:45:14.380144+00
066d193d-00ee-4b70-bfb7-200065ed0028	9ee020d3-7439-4061-a731-412165cc473e	741433f9-c5e5-4c2e-baa7-683c48d8bac3	2026-03-22 04:45:14.533609+00
159dbc29-584f-42f6-b876-d37a497e7b6e	c3e7604c-b46f-45b6-993d-896b3794941d	c7e223ea-5b8f-489a-a09a-dad3f280e522	2026-03-22 04:46:42.056746+00
4eacc102-08cf-4dc5-984e-f97bd480d3ae	cdcfa4a4-35fe-40d5-b6c4-38135c21e6d0	e432e22c-1f64-404d-b71c-f60d84415cac	2026-03-30 14:09:58.79766+00
c6f42809-a659-4d27-b530-9a1e38c54670	be8379f8-d677-4f14-9cb6-b6995fad28a7	3bae1580-738e-4f09-ae95-a76cc8092719	2026-03-30 14:32:23.055336+00
ba8b3c3c-50c8-49b0-b4e2-ec3b9b55979a	102fdec4-5106-4eaa-86fa-7c6efc2d74ee	49b897c0-9705-4ff9-b4a7-20e401bff9b6	2026-03-30 14:38:22.112318+00
4835aefb-37ff-4508-b05b-9abc3e3ba52f	7655676e-aae0-49e2-a44f-36ea3b324331	639e61ff-f700-4c90-9e2d-a21c8574172f	2026-03-30 14:47:39.400324+00
d28165b2-dd07-4e9a-a541-5cc2ba9b0fb0	3612f657-bb44-4a7f-b0c8-f652a91940dd	b3809702-8afe-4106-ac70-985cc526e013	2026-03-30 14:58:35.916499+00
79c5dea5-a3b2-4152-a1f2-b0dc2f183f9d	1d5a6746-dd5a-4e6c-811c-3b744174b7df	834138cf-c314-4dbb-9956-d6eb4960d1a2	2026-03-30 15:17:25.590001+00
cc6dde97-4468-4d14-ae6a-0b7d53b397d3	713816c1-45b6-418a-9d30-964d86e575fd	04894e98-8b4e-4a19-9347-07bb1b552cef	2026-03-30 15:35:25.461047+00
3a1de21d-cf0c-4761-9e0c-2ff22777f030	6e4e2898-687d-45cb-b086-184af3570c77	79747488-a713-4a2b-bb61-aab2f96c109a	2026-03-30 16:00:38.240824+00
fc48a69f-09e5-44d5-9a17-01bb3a7b7564	c0ae7190-1af5-47d3-975c-81d81b86eeb9	5f4137e7-2348-4ed1-8883-8f76ae555f64	2026-03-31 16:04:04.753968+00
2037b08d-d8cb-4374-a33d-b768d84f6420	83e41340-a26c-41df-a623-5f8a007c002c	52b3d679-9241-49d0-a5a0-782b7d58a6f9	2026-04-01 09:52:12.838173+00
f6631ac5-6fe7-431c-ba2a-bbee81e09497	b7128d70-9ad1-41da-8541-5607c2d1913d	8250f1a3-21b4-41bb-9943-b38b4177ab19	2026-04-01 11:32:38.873637+00
93e48b0e-0922-46a0-a76c-2e2f964e50fc	9cf7c204-4818-4adb-a85f-8ecb29cf68fd	2c49fa61-eb1c-4a48-bf82-e6d978a2af6e	2026-04-01 11:58:39.914649+00
9ad7ebe2-ca5a-4331-8efb-69a796d503db	b3b8d429-ab15-4ba0-ad68-513436d7eba8	5855dd37-8d72-4fbc-af42-ae4173370647	2026-04-01 12:01:25.974159+00
10f9910c-60e5-4325-bb31-9b8fc5dcacd4	ae9e20a7-33b7-432e-9a85-e3dff5a02b83	4bced266-e7d9-4e0d-b836-8d40c1be7ba2	2026-04-01 13:23:35.461065+00
051c3190-911d-4696-8d4a-c329b13e25f8	e7d0ef97-921c-4207-97ce-117fd680dcab	38232373-65a5-42bb-b51b-98c746cbb73b	2026-04-01 13:49:07.136481+00
74dbaf42-bae9-42a8-a719-f7f1412c4e00	091141fc-70d8-45b0-bfc0-942749e58e4d	0e15fe9a-54e0-4039-9428-922e8b4f3001	2026-04-01 14:05:03.264278+00
70228e28-4667-478b-bcf3-ef1560e52500	c50064b1-e6b3-4ade-ba2a-725c00c2c1af	13cc6d81-de58-4ae2-b687-6de663ff378a	2026-04-01 14:49:46.74158+00
ad2bba8b-e74d-4758-9700-1d14b33d6d0c	0657b88a-b69b-469d-8afd-22555e28baa1	a05560ee-4c3a-47dc-b18e-5451f2ad0722	2026-04-01 14:50:22.955887+00
3a4c903d-fa89-4d93-906c-60e41405ad55	1d5a6746-dd5a-4e6c-811c-3b744174b7df	a77fdee5-96a6-45db-b130-3d6b2b428d13	2026-04-01 15:21:25.070114+00
fba018aa-e245-4dc8-9eb3-63f23fb7eebc	1d5a6746-dd5a-4e6c-811c-3b744174b7df	925993a6-20a9-4593-ab21-3d3ee527b596	2026-04-01 15:21:33.561391+00
4d7fd4d8-48de-4d66-8cb2-da651c5a1ffd	ff4393c2-0899-4764-8002-29386b6d3af3	4f186972-5762-4278-9bda-c91040959f69	2026-04-01 15:25:37.05212+00
14092f09-1dca-4b66-a535-58aa4b9e30ba	2bd07fec-2c5e-4687-a291-1116113eaa4a	a1c015c1-9a13-4039-8279-f9bfb195f51e	2026-04-01 15:30:20.727773+00
c47ae5ce-6669-4006-8b1f-8ad5a2b65610	ae16e44c-5162-429e-bb76-ac4f6f40fda9	9041c8e3-a16a-4645-8e1f-4fafa424aed4	2026-04-01 15:59:42.929352+00
8b307d73-8708-40a1-b687-dac59eb96b06	e7d0ef97-921c-4207-97ce-117fd680dcab	3b0872d0-d7b8-481f-8ed2-af5122f8f01c	2026-04-02 11:25:44.930084+00
327c1bf3-482b-459a-9c7d-369e70124c31	b3b8d429-ab15-4ba0-ad68-513436d7eba8	ed0bffdf-9f89-4130-b01e-58bfd13e0c31	2026-04-02 11:27:21.215949+00
07a8984d-81c6-48e7-b32d-49c17b4a2be2	9cf7c204-4818-4adb-a85f-8ecb29cf68fd	83b98592-8abc-4892-ad6c-4ffe6578c4ee	2026-04-02 11:32:43.396919+00
4e41ba4e-c6fd-4094-9a31-7f275b3ee2d1	5cb6881e-f6a5-4486-b425-66232040847a	0d93aff5-3765-4ffd-b54f-7fb14515483f	2026-04-02 12:32:19.01106+00
5a1122f1-2d46-4784-9a17-f59036f1f1ae	fbf144af-3b63-42bf-a5bd-b6768ac67c03	5d05c323-9c60-4215-8419-cbf1dbb5f70d	2026-04-02 12:43:31.525647+00
4d43c74d-26ed-4e7a-b106-44c01dd01174	6d0572e1-3e78-4c19-acc0-3909df255fe0	2fbe296c-4b86-4eb0-9f5a-a2457e947c21	2026-04-02 14:10:04.36216+00
67931b5a-ad72-4fac-bfe7-f37b818fda4c	ae9e20a7-33b7-432e-9a85-e3dff5a02b83	680ff6b7-8050-4f8d-b77f-272a51fdec89	2026-04-02 14:16:21.979014+00
621259e1-e549-4384-9cc5-fb86e39d2c63	0657b88a-b69b-469d-8afd-22555e28baa1	302f8c46-33ca-4255-aa06-8fd3210f23c3	2026-04-02 14:51:34.646052+00
80d737af-bf25-4174-a5f9-d25dde71f5ec	c62bc63d-6194-494f-915a-c95d3c127abb	a8804faa-24eb-44df-bdd4-35f7f093105c	2026-04-02 15:13:50.490775+00
6e0f5a67-3efe-4b1f-94b4-31349191fb7f	da95a893-3efb-4beb-8a75-8d123db3482d	a5b373f7-0a55-4696-a997-b846a6b0a80b	2026-04-02 15:17:13.087345+00
36e4a701-9187-4540-917f-fbf357b5b4f0	1d5a6746-dd5a-4e6c-811c-3b744174b7df	d602e00b-88af-44b6-903f-4f730b58ba3c	2026-04-02 15:26:33.286561+00
bffa6993-3f46-4768-8fe5-75a48d2137c1	e7d0ef97-921c-4207-97ce-117fd680dcab	a3d0ade0-4593-49ab-8bc2-bbd04bb5de5c	2026-04-03 12:17:44.570485+00
f03f7bb8-c1ad-4fef-a3a4-a930ccb4f33f	9cf7c204-4818-4adb-a85f-8ecb29cf68fd	dd776b42-75e2-4445-a889-ea9bbe42aa5b	2026-04-03 12:51:50.436983+00
bb5d3a3f-1f84-49c4-8416-d4ebcf3a303d	85dade61-6ba2-4ef9-89a9-f2b64781b9ce	046dfb35-3381-45ef-98c1-a07286b8ac71	2026-04-03 13:27:36.598507+00
f70b68a0-3b76-41aa-83ad-79eda534279c	0fac967c-7783-44ac-8ca7-99d43bf04679	683082a2-5961-456c-b433-5024a4b067ec	2026-04-03 14:31:14.38133+00
67e098df-47da-4aaf-b063-fa76b63fea7c	0657b88a-b69b-469d-8afd-22555e28baa1	0d68a76b-ba86-42a1-a86e-542689fc1c49	2026-04-03 14:31:34.173553+00
cf4e627a-2d7a-4750-ad64-01ce42073fa5	cbe583f3-84c0-4db1-82ad-a1a019150ee2	3694acf1-3a15-44b9-be57-6f83c0d01db1	2026-04-03 14:48:37.899437+00
3e6b63be-059e-48ee-b21a-6cb254ed31ff	cbe583f3-84c0-4db1-82ad-a1a019150ee2	cdafbd1e-3e19-4daa-b552-e9de6ad603e1	2026-04-03 14:55:19.613058+00
655ff3a8-0bdc-492d-b03a-17f2c687f133	fbf144af-3b63-42bf-a5bd-b6768ac67c03	c4db938d-ed3c-4195-badb-3292394b3195	2026-04-03 14:56:08.18681+00
49c673d4-703e-4bc6-9bbf-b61936e36383	eb1f578e-f0cc-48b1-9bad-d934198090f3	833b27e6-8a48-4e20-9d72-96954f6c1bb8	2026-04-03 15:50:07.554274+00
d02e3b8b-e4f1-47f1-9685-32fde408a2c5	0db2e21c-c13d-4cd6-aaaa-a5b6adb1afb3	966af58d-bcb8-4316-a52a-930cc9dc8265	2026-04-03 15:59:08.758228+00
0d275a35-e1b1-4bdc-bf81-63feff300930	1d5a6746-dd5a-4e6c-811c-3b744174b7df	f9719581-dbff-4864-9b21-9ae30b4806a0	2026-04-03 15:59:54.43636+00
73879138-7a75-42d3-b15e-f75da7445758	133a36f8-bb1f-48b5-b840-eca8e0d8203c	11f641a5-8b84-4ce8-bbda-610f46142d26	2026-04-03 16:24:02.586462+00
1008c366-f6fe-4913-b2d9-98f137de6b86	4b4a2952-1b1f-4a2c-b66e-336df0686a55	dd1b98cb-218b-4d77-9ebe-27d773a0f795	2026-04-04 14:12:48.550656+00
af9d4f98-bb4d-493d-96b5-f85eb4308a5d	e7d0ef97-921c-4207-97ce-117fd680dcab	0d1ad374-d94d-42cc-b0d3-289419c5b9d9	2026-04-04 14:54:03.33472+00
5285ad52-e297-4ca2-8965-a136fcc4ca5c	b3b8d429-ab15-4ba0-ad68-513436d7eba8	c9d7cfef-bf27-4dd6-ba94-59efc0792d36	2026-04-06 11:29:20.559532+00
4e54b649-1e98-4f89-a9aa-665dd31315a7	7cbd8f64-ad8e-42e5-b012-5d19067c11b2	a095d6ef-c4d4-492a-86f0-1cd8ad92930b	2026-04-06 15:42:55.358985+00
56f027fb-30ba-4db5-b6ed-4859606d171f	e7d0ef97-921c-4207-97ce-117fd680dcab	c3e2c9bd-01e4-46f3-bc0d-7f1178359dab	2026-04-06 15:43:52.823651+00
4cbdd826-74d2-4095-b54b-9c30ccd3c387	c42f544f-6ea9-4967-9fec-018e95d8c9db	ef75ea9c-559b-42c5-9caa-d37cbca2a6c3	2026-04-07 14:52:56.047763+00
5fb5356b-8c0a-4e70-9fc6-40a113a576f0	ce6b48e2-fbe1-4e3f-8864-9705f8db3e1d	9f526cfa-837a-4564-beb3-d012e96de125	2026-04-07 15:24:44.538028+00
d241b373-67cd-4c5d-876a-8dfbdb6dc6e5	eb1f578e-f0cc-48b1-9bad-d934198090f3	bac9c8ef-f571-44a9-ad9d-b54aea23c7d0	2026-04-08 13:41:52.311732+00
d0317388-58d1-442e-8fc2-a59c485b0625	e7d0ef97-921c-4207-97ce-117fd680dcab	f70b297f-4dbd-47f5-a7b1-a2b8626621a1	2026-04-08 13:42:18.239206+00
0982d0f6-07e9-4dd3-ad25-68d91e6bdf46	86c8de37-9ab3-41de-a17c-69fb640b57cd	84240672-49c9-4d3d-9cfd-abe10d8dcf23	2026-04-08 13:47:22.667883+00
e4071254-b27a-4353-bbc0-759059858610	350ab1a1-4404-4873-bac1-c8deb601c835	592a7455-6591-4379-8f2f-cc5d61dbae9a	2026-04-08 14:19:30.782028+00
ffff743c-3e39-469a-beaa-07470415fa63	0657b88a-b69b-469d-8afd-22555e28baa1	98b7e658-1762-4cba-8dc1-018031996e79	2026-04-08 14:46:57.129511+00
306051d4-d125-4aca-967f-dedc20b2ccbf	a2206f02-1376-455b-bfc1-bb87d068b894	2493e535-7c89-4a7a-abdb-97ff4f251a23	2026-04-10 11:14:58.55593+00
404e4f7f-684f-40e7-837e-7ee6043b13da	eb1f578e-f0cc-48b1-9bad-d934198090f3	03d3f07b-33fb-4f6b-8b10-3bac630f5c38	2026-04-10 12:43:52.960818+00
768cfe0b-a8bb-4497-8fc6-f427f303cc8b	9cf7c204-4818-4adb-a85f-8ecb29cf68fd	112c79fa-1131-49e2-bdea-63964eaea10d	2026-04-10 12:44:51.252828+00
e93126dd-dc17-4d2a-8031-40274d1b8523	9344135d-27f1-4a2c-aed2-9fc76752fc15	912cec58-ea2c-4833-a82a-48fb3e0281d2	2026-04-10 13:21:59.188841+00
55820cec-1527-414b-a0f3-fffe965c978e	0fac967c-7783-44ac-8ca7-99d43bf04679	d81e75a6-d8ac-4941-a402-41946eeca960	2026-04-10 13:24:27.137042+00
2a0364c2-9336-401d-a2b7-bf601175d475	74dd7cc9-3b0a-426e-887f-1edf281f209d	ca3f75e1-765f-4fc9-9d2f-d6a8fe95285d	2026-04-10 13:39:26.557107+00
fcd3aad7-2076-4552-b028-9b02a65644f9	e0e36b55-6212-4b64-a5e9-495dfca391b0	efc475c6-522d-4fd5-8c00-c8762e0e345e	2026-04-10 13:44:33.615645+00
5a17b4f7-878b-479b-82f9-1c68e834048e	0657b88a-b69b-469d-8afd-22555e28baa1	0ffd995b-ced2-4b7c-9593-ce41234dbb00	2026-04-10 14:39:30.470278+00
c7afe49c-0f30-4583-8c60-15f32f0a4dc8	0fac967c-7783-44ac-8ca7-99d43bf04679	42f36d7d-78dc-46aa-a31f-b9bcd7a17392	2026-04-13 15:12:47.837197+00
cc1f5413-7d93-4dbf-bbb1-e1118fb366d8	0950625c-50de-4115-a0f3-e96716751c8c	5bd102b1-0bf3-4084-902d-817c86d6fb1d	2026-04-14 11:40:09.18784+00
f5a391bf-fc98-49f1-8183-8ff6a040cb96	fb60b19d-a30a-4078-a75c-a01897e75787	cb290522-49d9-487f-869a-604d24e0bfb8	2026-04-15 14:03:25.664045+00
31a2e276-7bf1-40ae-8ac6-3633466c0a8a	0503a047-2d37-40e2-954f-fdbfff8f0671	dbe57516-4206-44f9-a795-151a30b4118e	2026-04-15 14:05:17.217189+00
c047dee8-0b69-4002-bea2-3e7c508308b6	0657b88a-b69b-469d-8afd-22555e28baa1	490902f5-449e-4158-8533-e8dd5a2f1c19	2026-04-15 14:40:42.47235+00
363a3277-0f7e-4684-88d7-fa8caa44d04b	d9f13bd9-5ed9-4656-8c37-887b518e6f48	6e6830b6-932d-4bec-9fe6-38c62a8ea7e4	2026-04-16 10:37:20.989584+00
bd270f6f-5014-4ce7-b15d-ea71a76acdf2	14173abe-f53e-4a23-a88a-9804fa709eac	41c0d93a-60ef-464f-910e-9b215096771a	2026-04-16 10:42:17.151009+00
c8a92350-6c10-4a12-bc42-4af32c42b76f	14ca45da-74e0-4a08-8279-cccbf108e3f4	fa9d9873-449e-4d9f-a77b-51321293d8a9	2026-04-16 10:44:41.888828+00
92e509c4-80ae-4dc9-9d97-314f92e83e03	fb948d18-3d03-4514-bdde-58f44bc566c7	8bccaeb3-2dd7-4acd-98ac-15549f128095	2026-04-16 10:47:25.99562+00
6e92343c-a157-4a97-be63-a0a0461aa951	978802cd-4694-4395-9df9-c842a4c2d253	c8454b9c-de39-4ba4-8b97-e08ba0794c11	2026-04-16 10:51:56.638046+00
1274861e-b546-427b-b616-b29837a7ca04	7ce97f05-5771-41f0-820c-15b121776798	d3555aed-65f7-44c2-a980-98c736a97d20	2026-04-16 13:51:02.624721+00
8c13935b-972d-42a7-99dd-9737aa6560a1	d964c2fc-ef8e-4de0-8a91-47e1bf3e3618	54f2cb3e-a2ce-44ff-8d0f-a1e4298dc4cf	2026-04-20 13:19:56.595514+00
312b9d22-8ba0-44c3-8458-bebe7f0b8573	cbe583f3-84c0-4db1-82ad-a1a019150ee2	369b1e53-9eda-41ba-8884-0a8b0f2b16f4	2026-04-21 15:30:32.116157+00
f03c1970-bb82-45ed-8a50-817e01f5264c	e7d0ef97-921c-4207-97ce-117fd680dcab	7b29440d-0ab4-4602-8794-bc72c2d011d1	2026-04-21 16:03:01.795093+00
630e33f6-817b-48b7-b387-8040800d29a4	e7d0ef97-921c-4207-97ce-117fd680dcab	eb38d077-8f6d-43bd-ad1a-04b1ef781057	2026-04-22 14:44:19.656486+00
\.


--
-- Data for Name: customer_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_preferences (id, customer_id, dietary_restrictions, allergies, favorite_items, preferred_payment_method, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, phone, email, first_name, last_name, date_of_birth, total_orders, total_spent, loyalty_points, is_active, created_at, updated_at) FROM stdin;
be8379f8-d677-4f14-9cb6-b6995fad28a7	9888814129	\N	Ratan	\N	\N	1	130.00	13	t	2026-03-30 14:31:44.860697+00	2026-03-30 14:32:23.11145+00
102fdec4-5106-4eaa-86fa-7c6efc2d74ee	9888480868	\N	Kulwinder	\N	\N	1	300.00	30	t	2026-03-30 14:34:44.618527+00	2026-03-30 14:38:22.170241+00
6f6f994e-86de-4fdc-9e55-5ab735f9a70f	9988505508	\N	Imrose	\N	\N	1	330.00	33	t	2026-01-29 14:48:51.433106+00	2026-01-29 14:49:30.430134+00
7655676e-aae0-49e2-a44f-36ea3b324331	6385851238	\N	Dr adithyan	\N	\N	1	170.00	17	t	2026-03-30 14:46:14.33342+00	2026-03-30 14:47:39.456086+00
3612f657-bb44-4a7f-b0c8-f652a91940dd	7986697675	\N	Aman	\N	\N	1	140.00	14	t	2026-03-30 14:57:32.099212+00	2026-03-30 14:58:35.976594+00
2bd07fec-2c5e-4687-a291-1116113eaa4a	8872222286	\N	JASPREET	\N	\N	1	210.00	21	t	2026-04-01 15:28:37.717555+00	2026-04-01 15:30:20.781955+00
a5fee63d-540c-45a6-a2b5-888948a3ccda	24312412341234	\N	test	\N	\N	0	0.00	0	t	2026-01-31 10:01:18.689652+00	2026-01-31 10:01:18.689652+00
121c71b6-0d95-44ad-8c4c-8721d70ecac5	7657867382	\N	arshdeep	singh	\N	0	0.00	0	t	2026-02-03 13:43:04.79824+00	2026-02-03 13:43:04.79824+00
61fda0d2-bfd3-4e03-9175-9e9616af09c7	9779968816	\N	risham	\N	\N	0	0.00	0	t	2026-02-03 13:43:44.327532+00	2026-02-03 13:43:44.327532+00
d1be9d2e-5fce-4719-b26d-92c430c4c4d6	8791000603	\N	argam	kumar	\N	0	0.00	0	t	2026-02-03 13:44:44.702809+00	2026-02-03 13:44:44.702809+00
eb097fe6-dedb-476d-96e6-82d227fd715e	8872871616	\N	tarun	deval	\N	0	0.00	0	t	2026-02-03 13:45:19.568122+00	2026-02-03 13:45:19.568122+00
c3efcbe4-1a70-476c-8e08-da5802e912a0	9815383274	\N	sushil	kumar	\N	0	0.00	0	t	2026-02-03 13:45:48.409054+00	2026-02-03 13:45:48.409054+00
95b3dbb4-093d-4c24-ba30-54ade5b41918	9780006827	\N	satvinder	singh	\N	0	0.00	0	t	2026-02-03 13:46:13.965481+00	2026-02-03 13:46:13.965481+00
d3455b4e-9270-4d02-a3fa-50bbb0951472	6283986150	\N	birendra	\N	\N	0	0.00	0	t	2026-02-03 13:46:52.867069+00	2026-02-03 13:46:52.867069+00
957c6410-1e51-426f-8d60-3ca520441f7f	82645717141	\N	parminder	singh	\N	0	0.00	0	t	2026-02-03 13:47:20.919333+00	2026-02-03 13:47:20.919333+00
34b576f0-3c83-4403-bd89-56a1d2bf9703	8360654514	\N	udey veer	singh	\N	0	0.00	0	t	2026-02-03 13:48:02.684979+00	2026-02-03 13:48:02.684979+00
8dc336a2-26cf-40be-8356-dd76310f920b	9814612494	\N	sarpal	\N	\N	0	0.00	0	t	2026-02-03 13:48:44.311045+00	2026-02-03 13:48:44.311045+00
14fe9452-5cd1-4b27-9416-7850136c0503	8558061813	\N	karan	\N	\N	0	0.00	0	t	2026-02-03 13:49:13.936811+00	2026-02-03 13:49:13.936811+00
55b660b6-fcd0-4ae7-a0fa-fd33f7cab79c	7696374630	\N	gaurav	thakur	\N	0	0.00	0	t	2026-02-03 13:50:40.230983+00	2026-02-03 13:50:40.230983+00
42eb9e90-3e6f-421f-b733-0b670acf0184	9780158312	\N	sukhjinder	s	\N	0	0.00	0	t	2026-02-03 13:51:14.474978+00	2026-02-03 13:51:14.474978+00
c079e1ba-fa34-4744-bc97-a2ef48fe030f	9034002779	\N	sahil	\N	\N	0	0.00	0	t	2026-02-03 13:51:39.375823+00	2026-02-03 13:51:39.375823+00
a60837bf-cbf6-49a9-abb1-952625641eb5	7814308418	\N	ankush	\N	\N	0	0.00	0	t	2026-02-03 13:52:30.216052+00	2026-02-03 13:52:30.216052+00
dd313876-4cbc-43bc-a98c-ec010c76a083	6230459216	\N	harsh	\N	\N	0	0.00	0	t	2026-02-03 13:53:14.539817+00	2026-02-03 13:53:14.539817+00
8f5ad640-2b97-42d8-9b37-d17398e87ca8	7009115497	\N	kuisha	verma	\N	0	0.00	0	t	2026-02-03 13:53:52.879301+00	2026-02-03 13:53:52.879301+00
5fe5e640-2ed1-49ff-b234-7c5e7494b706	9041453140	\N	mavpreet	s	\N	0	0.00	0	t	2026-02-03 13:54:21.11914+00	2026-02-03 13:54:21.11914+00
00235278-8c84-4171-b316-132baea7a489	8727972714	\N	sumeet	s	\N	0	0.00	0	t	2026-02-03 13:54:53.352428+00	2026-02-03 13:54:53.352428+00
c51c64ae-4b24-41f1-811a-be60766780c8	6239821457	\N	p . sharma	\N	\N	0	0.00	0	t	2026-02-03 13:55:38.283329+00	2026-02-03 13:55:38.283329+00
e5aa5d91-edeb-4acf-b7d1-514292024987	8630812042	\N	lakshay	\N	\N	0	0.00	0	t	2026-02-03 13:56:02.323111+00	2026-02-03 13:56:02.323111+00
0a3f5661-b807-4c31-ac60-7e475475e65e	6239679202	\N	harinder	s	\N	0	0.00	0	t	2026-02-03 13:56:30.215734+00	2026-02-03 13:56:30.215734+00
c930b354-e11d-40dc-8b5e-87903ff935ec	9876996858	\N	jatinder	singh	\N	0	0.00	0	t	2026-02-03 13:58:02.667367+00	2026-02-03 13:58:02.667367+00
d907c673-e5e0-493c-b33d-703965de87a3	07837733549	guptarajat234@gmail.com	rajat	Gupta	\N	11	3490.00	337	t	2026-01-28 05:29:28.439106+00	2026-02-04 06:21:32.516593+00
bdd9e4b9-0f6b-4b08-9bc3-d08476741a34	9876543210	john.doe@example.com	John	Doe	\N	1	260.00	26	t	2026-01-31 13:31:41.365565+00	2026-03-22 04:44:24.587409+00
5abbc086-3cef-441e-9737-8296223ba6ba	1110000003	\N	Concurrent	3	\N	1	130.00	13	t	2026-03-22 04:44:48.69245+00	2026-03-22 04:44:52.621859+00
696327c6-aa78-4964-8279-14bc4cf749fd	1110000002	\N	Concurrent	2	\N	1	130.00	13	t	2026-03-22 04:44:48.69585+00	2026-03-22 04:44:53.564095+00
2e30c0c3-5c65-435a-aca6-76f861bdbbf7	1110000001	\N	Concurrent	1	\N	1	130.00	13	t	2026-03-22 04:44:50.099141+00	2026-03-22 04:44:53.645773+00
0d2cbb2a-136b-440c-a15b-5e530da76170	1110000004	\N	Concurrent	4	\N	1	130.00	13	t	2026-03-22 04:44:50.050505+00	2026-03-22 04:44:54.221871+00
573ec462-8ead-466f-a399-178b2dae1f51	1110000005	\N	Concurrent	5	\N	1	130.00	13	t	2026-03-22 04:44:50.133752+00	2026-03-22 04:44:54.511927+00
9ee020d3-7439-4061-a731-412165cc473e	9999888777	\N	Duplicate	Test	\N	2	260.00	26	t	2026-03-22 04:45:10.212827+00	2026-03-22 04:45:15.058352+00
c3e7604c-b46f-45b6-993d-896b3794941d	8888777666	\N	Variant	Test	\N	1	180.00	18	t	2026-03-22 04:46:39.573513+00	2026-03-22 04:46:42.57258+00
cdcfa4a4-35fe-40d5-b6c4-38135c21e6d0	8557984227	\N	Rupinder	\N	\N	1	120.00	12	t	2026-03-30 14:09:16.746797+00	2026-03-30 14:09:58.853689+00
713816c1-45b6-418a-9d30-964d86e575fd	7018912044	\N	Indin	\N	\N	1	160.00	16	t	2026-03-30 15:35:02.786964+00	2026-03-30 15:35:25.52225+00
473cab56-0aa9-4397-aff6-8fa5fae35c9f	8264571741	\N	Parminder	\N	\N	0	0.00	0	t	2026-03-30 15:42:16.41135+00	2026-03-30 15:42:16.41135+00
6e4e2898-687d-45cb-b086-184af3570c77	9779200053	\N	Sukhjot	\N	\N	1	650.00	65	t	2026-03-30 15:59:44.511571+00	2026-03-30 16:00:38.307895+00
c0ae7190-1af5-47d3-975c-81d81b86eeb9	9888833326	\N	Emmie	\N	\N	1	280.00	28	t	2026-03-31 16:00:31.534731+00	2026-03-31 16:04:04.811171+00
83e41340-a26c-41df-a623-5f8a007c002c	8968700270	\N	New	\N	\N	1	340.00	34	t	2026-04-01 09:49:14.481317+00	2026-04-01 09:52:12.89818+00
b7128d70-9ad1-41da-8541-5607c2d1913d	9872266265	\N	sehaj	\N	\N	1	300.00	30	t	2026-02-03 13:56:58.695743+00	2026-04-01 11:32:38.929334+00
5cb6881e-f6a5-4486-b425-66232040847a	8899048219	\N	Ubaid khan	\N	\N	1	280.00	28	t	2026-04-02 12:31:30.943247+00	2026-04-02 12:32:19.074393+00
091141fc-70d8-45b0-bfc0-942749e58e4d	7986546791	\N	PUNEET	\N	\N	1	210.00	21	t	2026-04-01 14:04:41.079152+00	2026-04-01 14:05:03.336003+00
c50064b1-e6b3-4ade-ba2a-725c00c2c1af	8725033137	\N	Anshul	\N	\N	1	300.00	30	t	2026-04-01 14:48:39.781969+00	2026-04-01 14:49:46.812125+00
0fac967c-7783-44ac-8ca7-99d43bf04679	9812550900	\N	Sameer	\N	\N	3	540.00	24	t	2026-04-03 14:30:53.406358+00	2026-04-13 15:12:47.931633+00
ff4393c2-0899-4764-8002-29386b6d3af3	9781989994	\N	Karan	\N	\N	1	170.00	17	t	2026-04-01 15:22:12.079656+00	2026-04-01 15:25:37.112429+00
ae16e44c-5162-429e-bb76-ac4f6f40fda9	7888835259	\N	Akashdeep	\N	\N	1	300.00	30	t	2026-04-01 15:58:53.669911+00	2026-04-01 15:59:42.994942+00
5dc7ed0f-da9c-436b-b11d-a754dd57705b	9592251119	\N	Robin	\N	\N	0	0.00	0	t	2026-04-03 13:01:51.924993+00	2026-04-03 13:01:51.924993+00
85dade61-6ba2-4ef9-89a9-f2b64781b9ce	7009562760	\N	Mandeep	\N	\N	1	440.00	44	t	2026-04-03 13:25:44.291911+00	2026-04-03 13:27:36.67062+00
6d0572e1-3e78-4c19-acc0-3909df255fe0	8427346684	\N	Gurpreet	\N	\N	1	360.00	36	t	2026-04-02 14:09:26.411663+00	2026-04-02 14:10:04.423138+00
ae9e20a7-33b7-432e-9a85-e3dff5a02b83	9316488821	\N	Archi	\N	\N	2	5253.00	525	t	2026-04-01 13:18:09.649186+00	2026-04-02 14:16:22.046249+00
c62bc63d-6194-494f-915a-c95d3c127abb	9815994592	\N	Ekam	\N	\N	1	170.00	17	t	2026-04-02 15:13:33.027141+00	2026-04-02 15:13:50.550759+00
da95a893-3efb-4beb-8a75-8d123db3482d	8569021786	\N	Pritpal singh	\N	\N	1	160.00	16	t	2026-04-02 15:16:53.632353+00	2026-04-02 15:17:13.147342+00
b3b8d429-ab15-4ba0-ad68-513436d7eba8	8727966718	\N	Birinder	\N	\N	3	300.00	30	t	2026-04-01 11:56:31.592385+00	2026-04-06 11:29:20.621365+00
cbe583f3-84c0-4db1-82ad-a1a019150ee2	8054638082	\N	Anmol	\N	\N	3	770.00	77	t	2026-04-03 14:48:25.190772+00	2026-04-21 15:30:32.170874+00
eb1f578e-f0cc-48b1-9bad-d934198090f3	7696343400	\N	Ajay	Maan	\N	3	710.00	71	t	2026-04-03 15:49:49.855948+00	2026-04-10 12:43:53.079305+00
fbf144af-3b63-42bf-a5bd-b6768ac67c03	9988161089	\N	Jaspreet	\N	\N	2	320.00	32	t	2026-04-02 12:42:29.430967+00	2026-04-03 14:56:08.274552+00
e7d0ef97-921c-4207-97ce-117fd680dcab	8882626545	\N	ryan	\N	\N	8	2640.00	80	t	2026-04-01 13:47:53.227495+00	2026-04-22 14:44:19.709466+00
0db2e21c-c13d-4cd6-aaaa-a5b6adb1afb3	8708002661	\N	Shebaz	\N	\N	1	320.00	32	t	2026-04-03 15:53:02.380674+00	2026-04-03 15:59:08.812048+00
1d5a6746-dd5a-4e6c-811c-3b744174b7df	7889088227	\N	Dara	\N	\N	5	1400.00	140	t	2026-03-30 15:16:31.491164+00	2026-04-03 15:59:54.49178+00
133a36f8-bb1f-48b5-b840-eca8e0d8203c	8837679312	\N	Varun	\N	\N	1	250.00	25	t	2026-04-03 16:23:39.990536+00	2026-04-03 16:24:02.647922+00
4b4a2952-1b1f-4a2c-b66e-336df0686a55	8054270064	\N	Saurav	\N	\N	1	230.00	23	t	2026-04-04 14:12:16.242074+00	2026-04-04 14:12:48.608703+00
0657b88a-b69b-469d-8afd-22555e28baa1	8284804416	\N	m. dogra	\N	\N	6	1120.00	112	t	2026-02-03 13:49:46.893338+00	2026-04-15 14:40:42.527635+00
9cf7c204-4818-4adb-a85f-8ecb29cf68fd	9781857530	\N	Aman	\N	\N	4	870.00	87	t	2026-04-01 11:57:42.751984+00	2026-04-10 12:44:51.307558+00
7cbd8f64-ad8e-42e5-b012-5d19067c11b2	8437068104	\N	Lovepreet	\N	\N	1	330.00	33	t	2026-04-06 15:42:29.0516+00	2026-04-06 15:42:55.417906+00
c42f544f-6ea9-4967-9fec-018e95d8c9db	9996187544	\N	Simar	\N	\N	1	210.00	21	t	2026-04-07 14:52:17.686958+00	2026-04-07 14:52:56.114776+00
ce6b48e2-fbe1-4e3f-8864-9705f8db3e1d	9988884994	\N	Atul	\N	\N	1	150.00	15	t	2026-04-07 15:24:18.164767+00	2026-04-07 15:24:44.589994+00
86c8de37-9ab3-41de-a17c-69fb640b57cd	8558885691	\N	Pardeep	\N	\N	1	150.00	15	t	2026-04-08 13:46:37.526939+00	2026-04-08 13:47:22.723603+00
350ab1a1-4404-4873-bac1-c8deb601c835	8872600268	\N	Arsh	\N	\N	1	710.00	71	t	2026-04-08 14:15:17.781048+00	2026-04-08 14:19:30.92676+00
a2206f02-1376-455b-bfc1-bb87d068b894	9316655228	\N	Suchsum	\N	\N	1	380.00	38	t	2026-04-10 11:14:11.508331+00	2026-04-10 11:14:58.610451+00
9344135d-27f1-4a2c-aed2-9fc76752fc15	8219444491	\N	Saurav	\N	\N	1	310.00	31	t	2026-04-10 13:21:00.626801+00	2026-04-10 13:21:59.247115+00
74dd7cc9-3b0a-426e-887f-1edf281f209d	9872076307	\N	Manraz	\N	\N	1	160.00	16	t	2026-04-10 13:38:53.367446+00	2026-04-10 13:39:26.619028+00
e0e36b55-6212-4b64-a5e9-495dfca391b0	6280565949	\N	Garry	\N	\N	1	170.00	17	t	2026-04-10 13:44:16.788458+00	2026-04-10 13:44:33.770325+00
a4a3d69a-c720-4002-959a-f6a4f2909bb4	7527993980	\N	Gurpreet	Singh	\N	0	0.00	0	t	2026-04-13 06:24:59.875213+00	2026-04-13 06:24:59.875213+00
0950625c-50de-4115-a0f3-e96716751c8c	8295241212	\N	Deepak	\N	\N	1	440.00	44	t	2026-04-14 11:38:17.028013+00	2026-04-14 11:40:09.247583+00
fb60b19d-a30a-4078-a75c-a01897e75787	9815687899	\N	Deepak	\N	\N	1	560.00	56	t	2026-04-15 14:02:42.701203+00	2026-04-15 14:03:25.741601+00
0503a047-2d37-40e2-954f-fdbfff8f0671	7814346557	\N	Ashneet	\N	\N	1	270.00	27	t	2026-04-15 14:03:53.152229+00	2026-04-15 14:05:17.27389+00
d9f13bd9-5ed9-4656-8c37-887b518e6f48	8360659942	\N	Vaibhav	\N	\N	1	300.00	30	t	2026-04-16 10:34:46.263707+00	2026-04-16 10:37:21.044058+00
14173abe-f53e-4a23-a88a-9804fa709eac	8684048182	\N	Harsh	Kumar	\N	1	160.00	16	t	2026-04-16 10:39:58.721979+00	2026-04-16 10:42:17.211123+00
14ca45da-74e0-4a08-8279-cccbf108e3f4	9877229862	\N	Aaditya	\N	\N	1	430.00	43	t	2026-04-16 10:43:09.474144+00	2026-04-16 10:44:41.962865+00
fb948d18-3d03-4514-bdde-58f44bc566c7	8559020323	\N	Sarabjeet	\N	\N	1	310.00	31	t	2026-04-16 10:45:54.559841+00	2026-04-16 10:47:26.053643+00
373f24aa-fec6-40fc-bc1b-c6a4209e0b69	97806986060	\N	Luvi	Singh	\N	0	0.00	0	t	2026-04-16 10:48:58.159805+00	2026-04-16 10:48:58.159805+00
978802cd-4694-4395-9df9-c842a4c2d253	9501758111	\N	Malkiat	Singh	\N	1	5250.00	525	t	2026-04-16 10:38:56.460462+00	2026-04-16 10:51:56.690903+00
7ce97f05-5771-41f0-820c-15b121776798	9988192271	\N	Karan	\N	\N	1	180.00	18	t	2026-04-16 13:50:20.653217+00	2026-04-16 13:51:02.681956+00
d964c2fc-ef8e-4de0-8a91-47e1bf3e3618	9872892308	\N	Divjot	\N	\N	1	180.00	18	t	2026-04-20 13:19:28.245323+00	2026-04-20 13:19:56.651187+00
\.


--
-- Data for Name: item_addons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.item_addons (id, menu_item_id, addon_id, price_override, is_allowed, max_quantity, created_at) FROM stdin;
\.


--
-- Data for Name: item_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.item_variants (id, menu_item_id, name, label, price, calories, protein_grams, display_order, is_available, created_at, updated_at) FROM stdin;
e4fb1779-cca3-4c2d-bc47-4cc61bf544d6	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	4oz	\N	180.00	\N	\N	0	t	2026-01-26 10:06:37.2821+00	2026-01-26 10:06:37.2821+00
dee854fa-4f03-42f6-b820-2044c35628f3	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	6oz	\N	210.00	\N	\N	1	t	2026-01-26 10:06:37.2821+00	2026-01-26 10:06:37.2821+00
73f21588-838d-40e5-ac0e-1d96c46e4471	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	8oz	\N	240.00	\N	\N	2	t	2026-01-26 10:06:37.2821+00	2026-01-26 10:06:37.2821+00
38ad0185-494f-459c-a72c-34e01b76f33b	48f53811-2cb7-4d15-b933-5face2413d9d	4oz	\N	200.00	\N	\N	0	t	2026-01-26 10:06:39.279581+00	2026-01-26 10:06:39.279581+00
9573e2ab-94f0-41cd-98a5-5129cda08e5b	48f53811-2cb7-4d15-b933-5face2413d9d	6oz	\N	230.00	\N	\N	1	t	2026-01-26 10:06:39.279581+00	2026-01-26 10:06:39.279581+00
6ecf6e2c-82fe-4d0e-b609-fbd529e82d30	48f53811-2cb7-4d15-b933-5face2413d9d	8oz	\N	250.00	\N	\N	2	t	2026-01-26 10:06:39.279581+00	2026-01-26 10:06:39.279581+00
12bf4b6e-fedb-41e5-9655-f4cd4b3b2e89	a872e54a-b4a3-4242-b972-042d139b9fda	4oz	\N	220.00	\N	\N	0	t	2026-01-26 10:06:41.271989+00	2026-01-26 10:06:41.271989+00
dd474827-c336-4e6a-ac93-f3eea4150427	a872e54a-b4a3-4242-b972-042d139b9fda	6oz	\N	250.00	\N	\N	1	t	2026-01-26 10:06:41.271989+00	2026-01-26 10:06:41.271989+00
586a51e2-55c7-40be-849d-5e1e327a5f53	a872e54a-b4a3-4242-b972-042d139b9fda	8oz	\N	280.00	\N	\N	2	t	2026-01-26 10:06:41.271989+00	2026-01-26 10:06:41.271989+00
249c79f8-6723-4738-a468-8c5f1cb10c2d	281c2639-fefa-484e-b0b7-748502526866	4oz	\N	150.00	\N	\N	0	t	2026-01-26 10:06:43.113093+00	2026-01-26 10:06:43.113093+00
7b5bdd47-77b7-46a1-a503-efe5d9f8dd0e	281c2639-fefa-484e-b0b7-748502526866	6oz	\N	180.00	\N	\N	1	t	2026-01-26 10:06:43.113093+00	2026-01-26 10:06:43.113093+00
b89f9d15-1077-4469-bf0d-1ca541211b1f	281c2639-fefa-484e-b0b7-748502526866	8oz	\N	210.00	\N	\N	2	t	2026-01-26 10:06:43.113093+00	2026-01-26 10:06:43.113093+00
9e637340-2bdc-41ee-8cef-3cad5e3e7cd5	76453f80-e7b2-4e52-b52d-ec2de2f78c79	4oz	\N	180.00	\N	\N	0	t	2026-01-26 10:06:45.042012+00	2026-01-26 10:06:45.042012+00
b08149bc-ffee-4c91-bea6-da655c166b9e	76453f80-e7b2-4e52-b52d-ec2de2f78c79	6oz	\N	210.00	\N	\N	1	t	2026-01-26 10:06:45.042012+00	2026-01-26 10:06:45.042012+00
30f24e06-cfc0-4adf-aa3a-16b7351b4725	76453f80-e7b2-4e52-b52d-ec2de2f78c79	8oz	\N	240.00	\N	\N	2	t	2026-01-26 10:06:45.042012+00	2026-01-26 10:06:45.042012+00
96353324-9c1c-4a99-97ab-4024503674fa	2a9939c1-b5b9-4e47-a9cf-0d7343c65805	4oz	\N	220.00	\N	\N	0	t	2026-01-26 10:06:47.062828+00	2026-01-26 10:06:47.062828+00
0042cb15-dc4c-4488-a1fd-0c9e14944bc2	2a9939c1-b5b9-4e47-a9cf-0d7343c65805	6oz	\N	250.00	\N	\N	1	t	2026-01-26 10:06:47.062828+00	2026-01-26 10:06:47.062828+00
b5276f34-e17f-4df4-a659-bdd5b2b6ddfa	2a9939c1-b5b9-4e47-a9cf-0d7343c65805	8oz	\N	280.00	\N	\N	2	t	2026-01-26 10:06:47.062828+00	2026-01-26 10:06:47.062828+00
38b7c9d7-316a-45e3-9358-f9430f53e9a1	653a9800-b1d9-47bb-9999-ac8af255cc5f	4oz	\N	240.00	\N	\N	0	t	2026-01-26 10:06:49.039682+00	2026-01-26 10:06:49.039682+00
26c697b1-0dc0-4eeb-ac4c-0c5fb0acbefa	653a9800-b1d9-47bb-9999-ac8af255cc5f	6oz	\N	270.00	\N	\N	1	t	2026-01-26 10:06:49.039682+00	2026-01-26 10:06:49.039682+00
32f7fdd8-20f7-4a2b-b386-45f45ba09517	653a9800-b1d9-47bb-9999-ac8af255cc5f	8oz	\N	300.00	\N	\N	2	t	2026-01-26 10:06:49.039682+00	2026-01-26 10:06:49.039682+00
4787abe3-276e-4ea7-bfc5-08d282fb019b	89ffef38-cb99-4575-929b-965b3c866aba	4oz	\N	240.00	\N	\N	0	t	2026-01-26 10:06:50.956066+00	2026-01-26 10:06:50.956066+00
97fdd6af-eed3-4add-b97c-41d5d74f835d	89ffef38-cb99-4575-929b-965b3c866aba	6oz	\N	270.00	\N	\N	1	t	2026-01-26 10:06:50.956066+00	2026-01-26 10:06:50.956066+00
32386bd9-ac7b-4dd6-91bd-a662debecace	89ffef38-cb99-4575-929b-965b3c866aba	8oz	\N	300.00	\N	\N	2	t	2026-01-26 10:06:50.956066+00	2026-01-26 10:06:50.956066+00
081c42de-52c0-4f83-856d-782da7f0ba1a	b7520834-6278-4c01-ab3f-aa227d4c9534	4oz	\N	280.00	\N	\N	0	t	2026-01-26 10:06:53.037636+00	2026-01-26 10:06:53.037636+00
033b5cfb-8a93-47dd-9abc-ff9a8f8f5d22	b7520834-6278-4c01-ab3f-aa227d4c9534	6oz	\N	320.00	\N	\N	1	t	2026-01-26 10:06:53.037636+00	2026-01-26 10:06:53.037636+00
0cc28d03-3b68-41cd-bca6-d599436f7aca	b7520834-6278-4c01-ab3f-aa227d4c9534	8oz	\N	360.00	\N	\N	2	t	2026-01-26 10:06:53.037636+00	2026-01-26 10:06:53.037636+00
68a50bc0-6956-4e26-9712-1cbef52796f8	38182410-6aff-4152-9b62-d045d5f47374	Half	\N	110.00	\N	\N	0	t	2026-01-26 10:06:55.051156+00	2026-01-26 10:06:55.051156+00
8d812ac2-5c39-4aad-b6de-f5b2ce1dd8c7	38182410-6aff-4152-9b62-d045d5f47374	Full	\N	220.00	\N	\N	1	t	2026-01-26 10:06:55.051156+00	2026-01-26 10:06:55.051156+00
431c4ee3-5a9c-4110-be55-37147973355a	7d2e5471-e564-4a16-9a2a-1274ebc417fc	Half	\N	150.00	\N	\N	0	t	2026-01-26 10:06:56.796219+00	2026-01-26 10:06:56.796219+00
0d7b1bea-4117-423d-9438-0a5bb4c285b9	7d2e5471-e564-4a16-9a2a-1274ebc417fc	Full	\N	250.00	\N	\N	1	t	2026-01-26 10:06:56.796219+00	2026-01-26 10:06:56.796219+00
50522a77-5987-4318-9352-1e5390b874a2	fe0cb6ba-d0a7-46ee-ace4-aca60314463a	Half	\N	160.00	\N	\N	0	t	2026-01-26 10:06:58.783384+00	2026-01-26 10:06:58.783384+00
42ce82f3-8c52-49d4-ac26-5e765ae48ca6	fe0cb6ba-d0a7-46ee-ace4-aca60314463a	Full	\N	260.00	\N	\N	1	t	2026-01-26 10:06:58.783384+00	2026-01-26 10:06:58.783384+00
ce2949c7-3995-4de8-893d-74f4a3058e3b	6de3d433-42fc-4b63-a82b-3ca0651a8bf7	Half	\N	170.00	\N	\N	0	t	2026-01-26 10:07:00.441301+00	2026-01-26 10:07:00.441301+00
98f5bfa3-1083-422a-b2f2-c881b5ddc9e9	6de3d433-42fc-4b63-a82b-3ca0651a8bf7	Full	\N	300.00	\N	\N	1	t	2026-01-26 10:07:00.441301+00	2026-01-26 10:07:00.441301+00
8d698c82-2156-4e67-8c3f-af1877fe0711	6c8f043f-3c75-48d5-b255-413f32a35993	Half	\N	180.00	\N	\N	0	t	2026-01-26 10:07:02.079707+00	2026-01-26 10:07:02.079707+00
aa270134-7fe6-436b-876b-6062c50bf984	6c8f043f-3c75-48d5-b255-413f32a35993	Full	\N	320.00	\N	\N	1	t	2026-01-26 10:07:02.079707+00	2026-01-26 10:07:02.079707+00
a22f8839-6fa7-4897-92d1-7e1778753c16	31769c76-e113-4215-ad13-024c957d74fb	Half	\N	190.00	\N	\N	0	t	2026-01-26 10:07:03.885376+00	2026-01-26 10:07:03.885376+00
371bedd5-98f4-4b53-8ef1-fbe083977f5d	31769c76-e113-4215-ad13-024c957d74fb	Full	\N	330.00	\N	\N	1	t	2026-01-26 10:07:03.885376+00	2026-01-26 10:07:03.885376+00
2bc5d403-6fb1-4bca-88a9-5816a6295fda	38008f78-4964-4c08-a575-638d4365d94b	Half	\N	200.00	\N	\N	0	t	2026-01-26 10:07:05.54469+00	2026-01-26 10:07:05.54469+00
9c60aac6-3448-45a3-b286-1ba72b50cbee	38008f78-4964-4c08-a575-638d4365d94b	Full	\N	350.00	\N	\N	1	t	2026-01-26 10:07:05.54469+00	2026-01-26 10:07:05.54469+00
9f97f0d2-b415-4755-a0e9-0ca585277ba0	14335c68-1add-467b-9907-8464333f2609	Brown Rice	\N	150.00	\N	\N	0	t	2026-01-26 10:07:07.107718+00	2026-01-26 10:07:07.107718+00
9ed9ebfd-5738-4a77-86b4-ed6b6eaaccf9	14335c68-1add-467b-9907-8464333f2609	Quinoa	\N	180.00	\N	\N	1	t	2026-01-26 10:07:07.107718+00	2026-01-26 10:07:07.107718+00
8237aeba-b529-4261-a899-e24692d1e326	8870e377-58cc-4203-8431-567a83141d61	Brown Rice	\N	170.00	\N	\N	0	t	2026-01-26 10:07:08.823832+00	2026-01-26 10:07:08.823832+00
b549969c-6661-4eff-9182-634cfca3e365	8870e377-58cc-4203-8431-567a83141d61	Quinoa	\N	200.00	\N	\N	1	t	2026-01-26 10:07:08.823832+00	2026-01-26 10:07:08.823832+00
b2a35cbd-c12d-48bc-b884-465beeafa1d7	3ee5f643-1711-471f-aa3e-0aa6085a458b	Brown Rice	\N	190.00	\N	\N	0	t	2026-01-26 10:07:10.459676+00	2026-01-26 10:07:10.459676+00
a9c86d47-a720-4cbf-860e-07922cb1d2b2	3ee5f643-1711-471f-aa3e-0aa6085a458b	Quinoa	\N	220.00	\N	\N	1	t	2026-01-26 10:07:10.459676+00	2026-01-26 10:07:10.459676+00
3bf7e2d9-b533-4024-b853-658bf812bc98	d893232c-bbbb-4968-8bf8-db2dcb81ad8b	Brown Rice	\N	250.00	\N	\N	0	t	2026-01-26 10:07:12.131163+00	2026-01-26 10:07:12.131163+00
eae221d8-b8e1-486e-9d71-ce4cbd359c81	d893232c-bbbb-4968-8bf8-db2dcb81ad8b	Quinoa	\N	280.00	\N	\N	1	t	2026-01-26 10:07:12.131163+00	2026-01-26 10:07:12.131163+00
e29960f5-d0dc-445e-9c30-b67c4092828b	89387366-fd7a-4079-99be-4274c6bddcef	Brown Rice	\N	270.00	\N	\N	0	t	2026-01-26 10:07:14.013426+00	2026-01-26 10:07:14.013426+00
d247d56d-78f5-4886-b3b4-b2ed4defb029	89387366-fd7a-4079-99be-4274c6bddcef	Quinoa	\N	300.00	\N	\N	1	t	2026-01-26 10:07:14.013426+00	2026-01-26 10:07:14.013426+00
d349c395-0221-4102-be41-17a0a03e0236	3c7263e8-2e63-4790-b63e-1cbd32376d94	Brown Rice	\N	300.00	\N	\N	0	t	2026-01-26 10:07:15.613014+00	2026-01-26 10:07:15.613014+00
88c9d812-b405-4298-8dc1-32b5639165c2	3c7263e8-2e63-4790-b63e-1cbd32376d94	Quinoa	\N	330.00	\N	\N	1	t	2026-01-26 10:07:15.613014+00	2026-01-26 10:07:15.613014+00
12935961-fc58-43ff-ae83-e7bc35b3e3cd	30e1ee6f-e12d-4126-a22b-7103e18ad57f	Brown Rice	\N	270.00	\N	\N	0	t	2026-01-26 10:07:17.326837+00	2026-01-26 10:07:17.326837+00
3ba23c43-1051-43be-92c5-a73bee759c8b	30e1ee6f-e12d-4126-a22b-7103e18ad57f	Quinoa	\N	300.00	\N	\N	1	t	2026-01-26 10:07:17.326837+00	2026-01-26 10:07:17.326837+00
4a3a7c0e-3e52-4f08-8c0c-9ea6ac85a3b2	d945b8d6-d09d-402f-b5ca-f4450189199c	Brown Rice	\N	290.00	\N	\N	0	t	2026-01-26 10:07:19.282186+00	2026-01-26 10:07:19.282186+00
53ade7d6-37b8-48ba-9d08-ba8dd76fa451	d945b8d6-d09d-402f-b5ca-f4450189199c	Quinoa	\N	320.00	\N	\N	1	t	2026-01-26 10:07:19.282186+00	2026-01-26 10:07:19.282186+00
5856438c-0500-4db4-8b2f-8de42adf9d3d	971b0d72-d468-4ebc-80eb-d63dba6aa3ae	Brown Rice	\N	320.00	\N	\N	0	t	2026-01-26 10:07:21.534344+00	2026-01-26 10:07:21.534344+00
b44e6c73-f5eb-4fb9-b705-c635fffaa711	971b0d72-d468-4ebc-80eb-d63dba6aa3ae	Quinoa	\N	350.00	\N	\N	1	t	2026-01-26 10:07:21.534344+00	2026-01-26 10:07:21.534344+00
4f161829-ab04-4757-bc50-777ced99aad5	c31202e4-5b92-42ec-b9a7-432777b043d3	Brown Rice	\N	370.00	\N	\N	0	t	2026-01-26 10:07:23.579045+00	2026-01-26 10:07:23.579045+00
4378372a-6ed8-49b6-8f2c-70b14c9833c3	c31202e4-5b92-42ec-b9a7-432777b043d3	Quinoa	\N	400.00	\N	\N	1	t	2026-01-26 10:07:23.579045+00	2026-01-26 10:07:23.579045+00
f8c823c2-501c-4cca-8357-ccde481978f1	d54a4ccf-ff15-49d0-ad22-cea989a20810	Brown Rice	\N	400.00	\N	\N	0	t	2026-01-26 10:07:25.175433+00	2026-01-26 10:07:25.175433+00
a360b0b3-bf72-4a17-b4af-ac1919636aa8	d54a4ccf-ff15-49d0-ad22-cea989a20810	Quinoa	\N	430.00	\N	\N	1	t	2026-01-26 10:07:25.175433+00	2026-01-26 10:07:25.175433+00
6be036e2-c278-4589-888c-27bfe80171bf	9465888d-aebc-4c5b-83b3-466d4110942d	Half	\N	130.00	\N	\N	0	t	2026-01-26 10:07:38.240156+00	2026-01-26 10:07:38.240156+00
7f6f544a-8a61-4162-b53d-5673ddc79ad9	9465888d-aebc-4c5b-83b3-466d4110942d	Full	\N	200.00	\N	\N	1	t	2026-01-26 10:07:38.240156+00	2026-01-26 10:07:38.240156+00
8fb0c283-92e9-4c6c-96e6-b1c76db2039f	60db4305-abb4-488c-b0b1-de61bb69f0c2	Half	\N	130.00	\N	\N	0	t	2026-01-26 10:07:39.824173+00	2026-01-26 10:07:39.824173+00
1bb89a45-071a-4f9d-9f7c-aec04e82b094	60db4305-abb4-488c-b0b1-de61bb69f0c2	Full	\N	200.00	\N	\N	1	t	2026-01-26 10:07:39.824173+00	2026-01-26 10:07:39.824173+00
2123c472-1e2e-466c-8e9e-95504ed13040	b6d4e95d-8862-493b-b4c2-98d796bf17e6	Half	\N	140.00	\N	\N	0	t	2026-01-26 10:07:41.387383+00	2026-01-26 10:07:41.387383+00
4c3fb42b-f746-445e-954a-dfbc9d076736	b6d4e95d-8862-493b-b4c2-98d796bf17e6	Full	\N	220.00	\N	\N	1	t	2026-01-26 10:07:41.387383+00	2026-01-26 10:07:41.387383+00
c7226ee0-c3cf-43c3-b31d-8bd50c7b803b	a872e54a-b4a3-4242-b972-042d139b9fda	10oz	250gm	300.00	\N	\N	0	t	2026-01-27 11:19:47.172626+00	2026-01-27 11:19:47.172626+00
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.locations (id, name, address, phone, is_active, created_at, updated_at) FROM stdin;
c61a3558-f8dd-40d3-902c-9a0a6c234997	Phase 9 Main Branch	\N	\N	t	2026-01-29 09:47:11.595449+00	2026-01-29 09:47:51.816095+00
\.


--
-- Data for Name: meal_packages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meal_packages (id, name, description, meal_count, price, validity_days, is_active, created_by, created_at, updated_at) FROM stdin;
972d8e18-a4dd-45cf-b6a9-52ef4d1564a8	30 Meals Package	Basic meal package with 30 meals	30	2999.99	30	t	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:02:39.583488+00	2026-01-31 13:02:39.583488+00
637ea375-e523-47da-9037-badcead90226	60 Meals Package	Standard meal package with 60 meals	60	5499.99	60	t	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:02:55.809231+00	2026-01-31 13:02:55.809231+00
391e49b9-1f76-4e63-a4fe-3ba7bdb9d925	90 Meals Package	Premium meal package with 90 meals	90	7999.99	90	t	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:02:56.87079+00	2026-01-31 13:02:56.87079+00
71c06eb5-d691-416a-9d5a-c4f059ba44c0	30 Meal Package	30 meals with 30 days validity	30	3000.00	30	t	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 14:05:35.684771+00	2026-01-31 14:05:35.684771+00
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_items (id, category_id, name, slug, description, image_url, diet_type, base_price, has_variants, variant_type, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, display_order, is_available, is_featured, created_at, updated_at) FROM stdin;
d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	889427de-fb27-4ec3-b9f0-004816c8bc24	Grilled Paneer	grilled-paneer	\N	\N	VEG	\N	t	SIZE	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:06:36.950076+00	2026-01-26 10:06:37.2821+00
a872e54a-b4a3-4242-b972-042d139b9fda	889427de-fb27-4ec3-b9f0-004816c8bc24	Robusted Paneer	robusted-paneer	\N	\N	VEG	\N	t	SIZE	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:06:41.007787+00	2026-01-27 11:19:47.482107+00
89ffef38-cb99-4575-929b-965b3c866aba	889427de-fb27-4ec3-b9f0-004816c8bc24	Grilled Chk Thigh	grilled-chk-thigh	\N	\N	NON_VEG	\N	t	SIZE	\N	\N	\N	\N	\N	7	f	f	2026-01-26 10:06:50.692909+00	2026-01-27 10:32:03.640493+00
76453f80-e7b2-4e52-b52d-ec2de2f78c79	889427de-fb27-4ec3-b9f0-004816c8bc24	Grilled Chk Breast	grilled-chk-breast	\N	\N	NON_VEG	\N	t	SIZE	\N	\N	\N	\N	\N	4	t	f	2026-01-26 10:06:44.774239+00	2026-01-26 10:06:45.042012+00
2a9939c1-b5b9-4e47-a9cf-0d7343c65805	889427de-fb27-4ec3-b9f0-004816c8bc24	Malaysian Chk Breast	malaysian-chk-breast	\N	\N	NON_VEG	\N	t	SIZE	\N	\N	\N	\N	\N	5	t	f	2026-01-26 10:06:46.802191+00	2026-01-26 10:06:47.062828+00
653a9800-b1d9-47bb-9999-ac8af255cc5f	889427de-fb27-4ec3-b9f0-004816c8bc24	Robusted Chk Breast	robusted-chk-breast	\N	\N	NON_VEG	\N	t	SIZE	\N	\N	\N	\N	\N	6	t	f	2026-01-26 10:06:48.773317+00	2026-01-26 10:06:49.039682+00
48f53811-2cb7-4d15-b933-5face2413d9d	889427de-fb27-4ec3-b9f0-004816c8bc24	Malaysian Paneer	malaysian-paneer	\N	\N	VEG	\N	t	SIZE	\N	\N	\N	\N	\N	1	f	f	2026-01-26 10:06:39.019465+00	2026-01-27 11:16:41.931115+00
b7520834-6278-4c01-ab3f-aa227d4c9534	889427de-fb27-4ec3-b9f0-004816c8bc24	Grilled Fish	grilled-fish	\N	\N	NON_VEG	\N	t	SIZE	\N	\N	\N	\N	\N	8	t	f	2026-01-26 10:06:52.778106+00	2026-01-27 11:20:11.323662+00
38182410-6aff-4152-9b62-d045d5f47374	d9de46e4-2398-460a-9f93-a78745e65e79	Vegan Protein Bowl	vegan-protein-bowl	\N	\N	VEGAN	\N	t	PORTION	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:06:54.788274+00	2026-01-26 10:06:55.051156+00
7d2e5471-e564-4a16-9a2a-1274ebc417fc	d9de46e4-2398-460a-9f93-a78745e65e79	Veg Protein Bowl	veg-protein-bowl	\N	\N	VEG	\N	t	PORTION	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:06:56.536494+00	2026-01-26 10:06:56.796219+00
fe0cb6ba-d0a7-46ee-ace4-aca60314463a	d9de46e4-2398-460a-9f93-a78745e65e79	Non Veg Protein Bowl	non-veg-protein-bowl	\N	\N	NON_VEG	\N	t	PORTION	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:06:58.476123+00	2026-01-26 10:06:58.783384+00
6de3d433-42fc-4b63-a82b-3ca0651a8bf7	f8900ff3-c9f8-4227-86a0-e71f8cb682d7	Veg Burrito Bowl	veg-burrito-bowl	\N	\N	VEG	\N	t	PORTION	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:00.171924+00	2026-01-26 10:07:00.441301+00
6c8f043f-3c75-48d5-b255-413f32a35993	f8900ff3-c9f8-4227-86a0-e71f8cb682d7	Non Veg Burrito Bowl	non-veg-burrito-bowl	\N	\N	NON_VEG	\N	t	PORTION	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:01.814159+00	2026-01-26 10:07:02.079707+00
31769c76-e113-4215-ad13-024c957d74fb	42aaf135-fc57-4a36-a3a8-4f13da2b5aab	Veg Quinoa Bowl	veg-quinoa-bowl	\N	\N	VEG	\N	t	PORTION	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:03.596208+00	2026-01-26 10:07:03.885376+00
38008f78-4964-4c08-a575-638d4365d94b	42aaf135-fc57-4a36-a3a8-4f13da2b5aab	Non Veg Quinoa Bowl	non-veg-quinoa-bowl	\N	\N	NON_VEG	\N	t	PORTION	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:05.200665+00	2026-01-26 10:07:05.54469+00
14335c68-1add-467b-9907-8464333f2609	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Rice and Salad	rice-and-salad	\N	\N	VEGAN	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:06.844399+00	2026-01-26 10:07:07.107718+00
8870e377-58cc-4203-8431-567a83141d61	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Mixed Beans and Rice	mixed-beans-and-rice	\N	\N	VEGAN	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:08.563514+00	2026-01-26 10:07:08.823832+00
3ee5f643-1711-471f-aa3e-0aa6085a458b	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Tofu with Rice	tofu-with-rice	\N	\N	VEGAN	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:07:10.11655+00	2026-01-26 10:07:10.459676+00
d893232c-bbbb-4968-8bf8-db2dcb81ad8b	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Grilled Paneer with Rice	grilled-paneer-with-rice	\N	\N	VEG	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	3	t	f	2026-01-26 10:07:11.871881+00	2026-01-26 10:07:12.131163+00
89387366-fd7a-4079-99be-4274c6bddcef	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Malaysian Paneer with Rice	malaysian-paneer-with-rice	\N	\N	VEG	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	4	t	f	2026-01-26 10:07:13.666087+00	2026-01-26 10:07:14.013426+00
3c7263e8-2e63-4790-b63e-1cbd32376d94	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Robusted Paneer with Rice	robusted-paneer-with-rice	\N	\N	VEG	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	5	t	f	2026-01-26 10:07:15.353302+00	2026-01-26 10:07:15.613014+00
30e1ee6f-e12d-4126-a22b-7103e18ad57f	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Grilled Chest with Rice	grilled-chest-with-rice	\N	\N	NON_VEG	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	6	t	f	2026-01-26 10:07:17.067857+00	2026-01-26 10:07:17.326837+00
d945b8d6-d09d-402f-b5ca-f4450189199c	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Malaysian Chest with Rice	malaysian-chest-with-rice	\N	\N	NON_VEG	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	7	t	f	2026-01-26 10:07:18.904899+00	2026-01-26 10:07:19.282186+00
971b0d72-d468-4ebc-80eb-d63dba6aa3ae	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Robusted Chest with Rice	robusted-chest-with-rice	\N	\N	NON_VEG	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	8	t	f	2026-01-26 10:07:21.269012+00	2026-01-26 10:07:21.534344+00
c31202e4-5b92-42ec-b9a7-432777b043d3	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Grilled Thigh with Rice	grilled-thigh-with-rice	\N	\N	NON_VEG	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	9	t	f	2026-01-26 10:07:23.319994+00	2026-01-26 10:07:23.579045+00
d54a4ccf-ff15-49d0-ad22-cea989a20810	5d7ab55f-b6ec-4b5e-b26d-e849084d5cc6	Fish and Rice Meal	fish-and-rice-meal	\N	\N	NON_VEG	\N	t	CARB_TYPE	\N	\N	\N	\N	\N	10	t	f	2026-01-26 10:07:24.914595+00	2026-01-26 10:07:25.175433+00
cae59b3a-1c52-4826-b7fe-b16f0a864229	10023351-9ecb-4e74-98c5-bbcd38154afb	Greek Salad	greek-salad	\N	\N	VEG	190.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:26.477186+00	2026-01-26 10:07:26.477186+00
66a47909-c8ee-42c1-8bd6-da04092d7f89	10023351-9ecb-4e74-98c5-bbcd38154afb	Grilled Paneer Salad	grilled-paneer-salad	\N	\N	VEG	230.00	f	\N	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:26.842603+00	2026-01-26 10:07:26.842603+00
27603ef8-f8c8-4cd9-9d13-ce14b8079e44	10023351-9ecb-4e74-98c5-bbcd38154afb	Tofu Salad	tofu-salad	\N	\N	VEGAN	170.00	f	\N	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:07:27.102982+00	2026-01-26 10:07:27.102982+00
91f55495-7b1f-48a9-acb9-dbed8a624f18	10023351-9ecb-4e74-98c5-bbcd38154afb	Mixed Beans Salad	mixed-beans-salad	\N	\N	VEGAN	160.00	f	\N	\N	\N	\N	\N	\N	3	t	f	2026-01-26 10:07:27.361207+00	2026-01-26 10:07:27.361207+00
c04f6bd1-af0c-4f72-bde0-43bbf19142f3	10023351-9ecb-4e74-98c5-bbcd38154afb	Pure Fiber	pure-fiber	\N	\N	VEGAN	200.00	f	\N	\N	\N	\N	\N	\N	4	t	f	2026-01-26 10:07:27.631906+00	2026-01-26 10:07:27.631906+00
78e0204d-c180-45a1-9fff-9643e1608585	10023351-9ecb-4e74-98c5-bbcd38154afb	Pineapple Salsa Salad	pineapple-salsa-salad	\N	\N	VEG	210.00	f	\N	\N	\N	\N	\N	\N	5	t	f	2026-01-26 10:07:27.981211+00	2026-01-26 10:07:27.981211+00
31be4805-5e36-47ac-a41d-d8480274a38c	10023351-9ecb-4e74-98c5-bbcd38154afb	Egg White Salad	egg-white-salad	\N	\N	EGGETARIAN	170.00	f	\N	\N	\N	\N	\N	\N	6	t	f	2026-01-26 10:07:28.248187+00	2026-01-26 10:07:28.248187+00
2a5ab1fe-8221-4893-9adb-6e791d7c408d	10023351-9ecb-4e74-98c5-bbcd38154afb	Chicken Greek Salad	chicken-greek-salad	\N	\N	NON_VEG	220.00	f	\N	\N	\N	\N	\N	\N	7	t	f	2026-01-26 10:07:28.578983+00	2026-01-26 10:07:28.578983+00
2bb42627-a156-4777-b3ec-4e9fe4a1bd07	10023351-9ecb-4e74-98c5-bbcd38154afb	Grilled Breast Salad	grilled-breast-salad	\N	\N	NON_VEG	230.00	f	\N	\N	\N	\N	\N	\N	8	t	f	2026-01-26 10:07:28.887971+00	2026-01-26 10:07:28.887971+00
eb600972-c543-4994-b6fa-fd4e12ec9869	10023351-9ecb-4e74-98c5-bbcd38154afb	Grilled Thigh Salad	grilled-thigh-salad	\N	\N	NON_VEG	250.00	f	\N	\N	\N	\N	\N	\N	9	t	f	2026-01-26 10:07:29.200373+00	2026-01-26 10:07:29.200373+00
68be6ad2-9e1d-4862-be84-1042ab7448ad	10023351-9ecb-4e74-98c5-bbcd38154afb	Grilled Fish Salad	grilled-fish-salad	\N	\N	NON_VEG	280.00	f	\N	\N	\N	\N	\N	\N	10	t	f	2026-01-26 10:07:29.482657+00	2026-01-26 10:07:29.482657+00
f35c2d97-95a0-4bdc-9b3c-0090b3d80761	955bcbfd-9c78-4992-b5ca-dd82e66e1edb	Yolk Lover (5 Whole Eggs)	yolk-lover-5-whole-eggs	Slow-cooked eggs over fresh veggies	\N	EGGETARIAN	200.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:29.82036+00	2026-01-26 10:07:29.82036+00
8a2bb540-c0c2-4e37-8076-93f2129e06e7	955bcbfd-9c78-4992-b5ca-dd82e66e1edb	All White (9 Egg Whites)	all-white-9-egg-whites	Slow-cooked egg whites over fresh veggies	\N	EGGETARIAN	230.00	f	\N	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:30.121584+00	2026-01-26 10:07:30.121584+00
34c975f1-a7e3-44c9-bf4c-c91770d59ea3	955bcbfd-9c78-4992-b5ca-dd82e66e1edb	Russian Eggs	russian-eggs	Five eggs with 100g chicken breast	\N	NON_VEG	250.00	f	\N	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:07:30.446989+00	2026-01-26 10:07:30.446989+00
0a6e9465-bd46-46b5-9898-9dcdd6051114	52809bbb-53da-45e3-9abf-faa01fbd347b	Vegan Quinoa Bowl (Indian)	vegan-quinoa-bowl-indian	150G quinoa with gravy and sauté veggie	\N	VEGAN	160.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:30.731645+00	2026-01-26 10:07:30.731645+00
bdd6e8bb-20d8-4127-a32a-4eac673f2377	52809bbb-53da-45e3-9abf-faa01fbd347b	Eggitarian Quinoa Bowl	eggitarian-quinoa-bowl	4 boiled egg whites with 150G quinoa and salad	\N	EGGETARIAN	180.00	f	\N	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:31.005142+00	2026-01-26 10:07:31.005142+00
7d3b00a0-2944-446c-a23f-1fa0e4fb89fb	52809bbb-53da-45e3-9abf-faa01fbd347b	Veg Quinoa Bowl (Indian)	veg-quinoa-bowl-indian	100G paneer with gravy, 150G quinoa and salad	\N	VEG	240.00	f	\N	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:07:31.309698+00	2026-01-26 10:07:31.309698+00
cbdab46b-7647-46f6-87f3-b07463f1d29c	52809bbb-53da-45e3-9abf-faa01fbd347b	Non Veg Quinoa Bowl (Indian)	non-veg-quinoa-bowl-indian	100G chicken breast with gravy and 150G quinoa	\N	NON_VEG	260.00	f	\N	\N	\N	\N	\N	\N	3	t	f	2026-01-26 10:07:31.575231+00	2026-01-26 10:07:31.575231+00
ab29820b-21ac-4554-95e2-cb34a87b416e	52809bbb-53da-45e3-9abf-faa01fbd347b	Vegan Brown Rice Bowl	vegan-brown-rice-bowl	150G brown rice with gravy and sauté veggie	\N	VEGAN	140.00	f	\N	\N	\N	\N	\N	\N	4	t	f	2026-01-26 10:07:31.957107+00	2026-01-26 10:07:31.957107+00
53cd72f2-2f69-4746-9274-ec998c5472f8	52809bbb-53da-45e3-9abf-faa01fbd347b	Eggitarian Brown Rice Bowl	eggitarian-brown-rice-bowl	4 boiled egg whites with 150G rice and salad	\N	EGGETARIAN	160.00	f	\N	\N	\N	\N	\N	\N	5	t	f	2026-01-26 10:07:32.275597+00	2026-01-26 10:07:32.275597+00
e667b385-4a19-42dc-912a-6d040894dba6	52809bbb-53da-45e3-9abf-faa01fbd347b	Veg Brown Rice Bowl	veg-brown-rice-bowl	100G paneer with gravy, 150G rice and salad	\N	VEG	220.00	f	\N	\N	\N	\N	\N	\N	6	t	f	2026-01-26 10:07:32.627884+00	2026-01-26 10:07:32.627884+00
96ddca34-c981-4a89-98d0-806a220d8688	52809bbb-53da-45e3-9abf-faa01fbd347b	Non Veg Brown Rice Bowl	non-veg-brown-rice-bowl	100G chicken breast with gravy and 150G rice	\N	NON_VEG	240.00	f	\N	\N	\N	\N	\N	\N	7	t	f	2026-01-26 10:07:32.909959+00	2026-01-26 10:07:32.909959+00
281c2639-fefa-484e-b0b7-748502526866	889427de-fb27-4ec3-b9f0-004816c8bc24	Steamed Chk Breast	steamed-chk-breast	\N	\N	NON_VEG	\N	t	SIZE	\N	\N	\N	\N	\N	3	f	f	2026-01-26 10:06:42.84828+00	2026-01-27 10:31:31.692499+00
996b0ace-1ce5-4ed7-a003-c6ab46b222b5	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Mixed Beans Wrap	mixed-beans-wrap	80g nutrition base	\N	VEGAN	100.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:33.347346+00	2026-01-26 10:07:33.347346+00
b3bae653-761d-4acb-8ee1-2d9896e6e5dd	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Tofu Wrap	tofu-wrap	80g nutrition base	\N	VEGAN	120.00	f	\N	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:33.63605+00	2026-01-26 10:07:33.63605+00
aa0823ce-faeb-443f-a1af-e2607ec42cea	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Grilled Paneer Wrap	grilled-paneer-wrap	80g nutrition base	\N	VEG	160.00	f	\N	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:07:33.962706+00	2026-01-26 10:07:33.962706+00
87d81156-91f0-453e-b49d-980c7e6eac30	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Steamed Chk Breast Wrap	steamed-chk-breast-wrap	80g nutrition base	\N	NON_VEG	160.00	f	\N	\N	\N	\N	\N	\N	3	t	f	2026-01-26 10:07:34.223902+00	2026-01-26 10:07:34.223902+00
3f3f3f34-c5fa-45bc-a46f-ec8cb2716fe2	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Grilled Chk Breast Wrap	grilled-chk-breast-wrap	80g nutrition base	\N	NON_VEG	170.00	f	\N	\N	\N	\N	\N	\N	4	t	f	2026-01-26 10:07:34.524478+00	2026-01-26 10:07:34.524478+00
f8aa9bd2-31cd-42b2-afeb-8273121bfcff	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Grilled Chk Thigh Wrap	grilled-chk-thigh-wrap	80g nutrition base	\N	NON_VEG	190.00	f	\N	\N	\N	\N	\N	\N	5	t	f	2026-01-26 10:07:34.827668+00	2026-01-26 10:07:34.827668+00
c6a6b152-35aa-4630-8e99-78b4de6f1863	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Herbaceous Submarine	herbaceous-submarine	100g nutrition base	\N	VEG	130.00	f	\N	\N	\N	\N	\N	\N	6	t	f	2026-01-26 10:07:35.14088+00	2026-01-26 10:07:35.14088+00
7159dc0c-5d7f-45d6-9e81-428f8261596a	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Grilled Paneer Submarine	grilled-paneer-submarine	100g nutrition base	\N	VEG	170.00	f	\N	\N	\N	\N	\N	\N	7	t	f	2026-01-26 10:07:35.440664+00	2026-01-26 10:07:35.440664+00
93f9b09f-32f0-4ad7-bcf9-1c0f63a5b7fe	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Grilled Tofu Submarine	grilled-tofu-submarine	100g nutrition base	\N	VEGAN	160.00	f	\N	\N	\N	\N	\N	\N	8	t	f	2026-01-26 10:07:35.702258+00	2026-01-26 10:07:35.702258+00
3d46a534-0d09-40fc-a801-40d69beb1b59	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Chk Breast Submarine	chk-breast-submarine	100g nutrition base	\N	NON_VEG	180.00	f	\N	\N	\N	\N	\N	\N	9	t	f	2026-01-26 10:07:36.056893+00	2026-01-26 10:07:36.056893+00
f21bab95-a2c3-4ae3-9f6d-482b7bf66a41	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Chk Thigh Submarine	chk-thigh-submarine	100g nutrition base	\N	NON_VEG	200.00	f	\N	\N	\N	\N	\N	\N	10	t	f	2026-01-26 10:07:36.381474+00	2026-01-26 10:07:36.381474+00
7f029ec1-80eb-407b-a490-588c07acc83d	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Vegan Delite Sandwich	vegan-delite-sandwich	100g nutrition base	\N	VEGAN	100.00	f	\N	\N	\N	\N	\N	\N	11	t	f	2026-01-26 10:07:36.646572+00	2026-01-26 10:07:36.646572+00
a514b4f1-076f-4638-83e2-6352e14e099f	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Grilled Paneer Sandwich	grilled-paneer-sandwich	100g nutrition base	\N	VEG	150.00	f	\N	\N	\N	\N	\N	\N	12	t	f	2026-01-26 10:07:36.952452+00	2026-01-26 10:07:36.952452+00
330ee1ca-ed43-48cd-96b3-bd707ba03547	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Grilled Chk Breast Sandwich	grilled-chk-breast-sandwich	100g nutrition base	\N	NON_VEG	170.00	f	\N	\N	\N	\N	\N	\N	13	t	f	2026-01-26 10:07:37.285699+00	2026-01-26 10:07:37.285699+00
86d89137-84b7-4d56-b16d-112c545f962e	db65a2de-9eb7-4e80-90f5-8a093748ba6c	Grilled Chk Thigh Sandwich	grilled-chk-thigh-sandwich	100g nutrition base	\N	NON_VEG	190.00	f	\N	\N	\N	\N	\N	\N	14	t	f	2026-01-26 10:07:37.622348+00	2026-01-26 10:07:37.622348+00
9465888d-aebc-4c5b-83b3-466d4110942d	21e9ffa4-7486-4c76-a92f-dcb3fa19223b	Whole Wheat Pasta	whole-wheat-pasta	\N	\N	VEG	\N	t	PORTION	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:37.977164+00	2026-01-26 10:07:38.240156+00
60db4305-abb4-488c-b0b1-de61bb69f0c2	21e9ffa4-7486-4c76-a92f-dcb3fa19223b	Whole Wheat Spaghetti	whole-wheat-spaghetti	\N	\N	VEG	\N	t	PORTION	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:39.54919+00	2026-01-26 10:07:39.824173+00
b6d4e95d-8862-493b-b4c2-98d796bf17e6	21e9ffa4-7486-4c76-a92f-dcb3fa19223b	Rice Noodles	rice-noodles	\N	\N	VEG	\N	t	PORTION	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:07:41.123893+00	2026-01-26 10:07:41.387383+00
9c2777a9-ef71-43d2-9dde-9971f76d1cb9	7bdd4b71-0c74-4923-b43f-d890d7c205e0	Leg Quarter	leg-quarter	With sauté veg	\N	NON_VEG	180.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:42.698219+00	2026-01-26 10:07:42.698219+00
d9b6c4cb-4650-4356-a0a1-57eb996c7ced	7bdd4b71-0c74-4923-b43f-d890d7c205e0	Double Leg Quarters	double-leg-quarters	With sauté veg	\N	NON_VEG	280.00	f	\N	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:42.959159+00	2026-01-26 10:07:42.959159+00
4003992b-500d-4cdc-acc9-2d4154dbdeed	7bdd4b71-0c74-4923-b43f-d890d7c205e0	Avocado Toast	avocado-toast	With sauté veg	\N	VEG	350.00	f	\N	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:07:43.221821+00	2026-01-26 10:07:43.221821+00
9eb6e3f1-ea8b-4dab-955f-16f9c103b9f5	7bdd4b71-0c74-4923-b43f-d890d7c205e0	Avocado Toast with Egg Whites	avocado-toast-with-egg-whites	With two egg whites and sauté veg	\N	EGGETARIAN	380.00	f	\N	\N	\N	\N	\N	\N	3	t	f	2026-01-26 10:07:43.483479+00	2026-01-26 10:07:43.483479+00
ef840b9f-cfbd-4a2e-a6dc-7bf2e060705d	7bdd4b71-0c74-4923-b43f-d890d7c205e0	Sunny Side Up Meal	sunny-side-up-meal	\N	\N	EGGETARIAN	70.00	f	\N	\N	\N	\N	\N	\N	4	t	f	2026-01-26 10:07:43.746645+00	2026-01-26 10:07:43.746645+00
63af43ea-62a8-45ca-a4a5-d630e38ed1f0	364e3366-57b2-4dfa-8203-a7f166deb620	Energy Booster	energy-booster	Beet root, carrot, apple, lemon & ginger	\N	VEGAN	130.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-01-26 10:07:44.053126+00	2026-01-26 10:07:44.053126+00
eef1d50c-632d-4724-9637-6cd26ec241b0	364e3366-57b2-4dfa-8203-a7f166deb620	Detox Green	detox-green	Cucumber, spinach, lemon, ginger & coconut	\N	VEGAN	130.00	f	\N	\N	\N	\N	\N	\N	1	t	f	2026-01-26 10:07:44.374828+00	2026-01-26 10:07:44.374828+00
3c8923a2-81b2-412a-bc48-5edffa493350	364e3366-57b2-4dfa-8203-a7f166deb620	Immunity Booster	immunity-booster	Orange, carrot, ginger, lemon & turmeric	\N	VEGAN	130.00	f	\N	\N	\N	\N	\N	\N	2	t	f	2026-01-26 10:07:44.642844+00	2026-01-26 10:07:44.642844+00
3a4a2bac-5b7a-40e0-acad-acbf6f2816f2	364e3366-57b2-4dfa-8203-a7f166deb620	Hydrater	hydrater	Orange, cucumber, ginger, lemon, coconut & honey	\N	VEGAN	130.00	f	\N	\N	\N	\N	\N	\N	3	t	f	2026-01-26 10:07:44.964777+00	2026-01-26 10:07:44.964777+00
9b51d9b6-a573-4f66-8461-dd9901f29d0f	364e3366-57b2-4dfa-8203-a7f166deb620	Detoxifier	detoxifier	\N	\N	VEGAN	70.00	f	\N	\N	\N	\N	\N	\N	4	t	f	2026-01-26 10:07:45.22964+00	2026-01-26 10:07:45.22964+00
062016cc-4f65-47c6-91f9-094919acc7ad	364e3366-57b2-4dfa-8203-a7f166deb620	Peanut Butter Banana	peanut-butter-banana	Peanut butter, banana & low fat milk	\N	VEG	110.00	f	\N	\N	\N	\N	\N	\N	5	t	f	2026-01-26 10:07:45.579708+00	2026-01-26 10:07:45.579708+00
7f46e64c-f0e0-46ba-9063-bcfc87a8a07f	364e3366-57b2-4dfa-8203-a7f166deb620	Brutes Gainer	brutes-gainer	Peanut butter, oats, banana & low fat milk	\N	VEG	140.00	f	\N	\N	\N	\N	\N	\N	6	t	f	2026-01-26 10:07:45.885535+00	2026-01-26 10:07:45.885535+00
3222be3d-1b64-4818-b383-fa2af6cb9180	364e3366-57b2-4dfa-8203-a7f166deb620	Egg Smoothie	egg-smoothie	Made of 7 boiled egg whites	\N	EGGETARIAN	100.00	f	\N	\N	\N	\N	\N	\N	7	t	f	2026-01-26 10:07:46.157+00	2026-01-26 10:07:46.157+00
0e71edc8-ad93-42a9-840c-fc9d9b1cbd52	364e3366-57b2-4dfa-8203-a7f166deb620	Bournvita Smoothie	bournvita-smoothie	\N	\N	VEG	120.00	f	\N	\N	\N	\N	\N	\N	8	t	f	2026-01-26 10:07:46.502097+00	2026-01-26 10:07:46.502097+00
0be76145-ce83-494b-9dc6-258242875da1	364e3366-57b2-4dfa-8203-a7f166deb620	Peanut Butter Egg Smoothie	peanut-butter-egg-smoothie	\N	\N	EGGETARIAN	150.00	f	\N	\N	\N	\N	\N	\N	9	t	f	2026-01-26 10:07:46.806508+00	2026-01-26 10:07:46.806508+00
e971da9c-0191-4ec4-a3dc-2ed0791a7988	364e3366-57b2-4dfa-8203-a7f166deb620	Cold Coffee	cold-coffee	\N	\N	VEG	90.00	f	\N	\N	\N	\N	\N	\N	10	t	f	2026-01-26 10:07:47.065278+00	2026-01-26 10:07:47.065278+00
52978b9e-14ed-4334-ad8e-3f844f494068	364e3366-57b2-4dfa-8203-a7f166deb620	Lemonade	lemonade	\N	\N	VEGAN	70.00	f	\N	\N	\N	\N	\N	\N	11	t	f	2026-01-26 10:07:47.329067+00	2026-01-26 10:07:47.329067+00
4cd455e3-7b00-4706-8e6b-2bcbc217a48a	364e3366-57b2-4dfa-8203-a7f166deb620	Lemon Soda	lemon-soda	\N	\N	VEGAN	80.00	f	\N	\N	\N	\N	\N	\N	12	t	f	2026-01-26 10:07:47.617306+00	2026-01-26 10:07:47.617306+00
087ac052-3142-42b6-8304-9c681499adab	364e3366-57b2-4dfa-8203-a7f166deb620	Beet Punch	beet-punch	\N	\N	VEGAN	120.00	f	\N	\N	\N	\N	\N	\N	13	t	f	2026-01-26 10:07:47.97695+00	2026-01-26 10:07:47.97695+00
78c1a614-663f-4849-8894-58cfa6cf1a22	364e3366-57b2-4dfa-8203-a7f166deb620	Popeyes Smoothie	popeyes-smoothie	Spinach green powerhouse	\N	VEGAN	120.00	f	\N	\N	\N	\N	\N	\N	14	t	f	2026-01-26 10:07:48.237324+00	2026-01-26 10:07:48.237324+00
b056f0c0-2c7f-42cb-8316-c966b5fca2f7	364e3366-57b2-4dfa-8203-a7f166deb620	Apple Mint	apple-mint	Crisp apple and cucumber with mint	\N	VEGAN	120.00	f	\N	\N	\N	\N	\N	\N	15	t	f	2026-01-26 10:07:48.549501+00	2026-01-26 10:07:48.549501+00
cd112fc2-efc6-461b-87cf-13e3b5f3aadd	364e3366-57b2-4dfa-8203-a7f166deb620	Mojito	mojito	\N	\N	VEGAN	120.00	f	\N	\N	\N	\N	\N	\N	16	t	f	2026-01-26 10:07:48.811416+00	2026-01-26 10:07:48.811416+00
25dc7a8a-9554-4dd3-92b8-2de730727407	364e3366-57b2-4dfa-8203-a7f166deb620	Green Apple Chiller	green-apple-chiller	\N	\N	VEGAN	120.00	f	\N	\N	\N	\N	\N	\N	17	t	f	2026-01-26 10:07:49.162788+00	2026-01-26 10:07:49.162788+00
3e8b1717-caea-4292-9a02-86ee91ced894	364e3366-57b2-4dfa-8203-a7f166deb620	Blue Berry Chiller	blue-berry-chiller	\N	\N	VEGAN	120.00	f	\N	\N	\N	\N	\N	\N	18	t	f	2026-01-26 10:07:49.422158+00	2026-01-26 10:07:49.422158+00
ce26ce60-70a1-415a-af2d-3e1fae1a1ae5	364e3366-57b2-4dfa-8203-a7f166deb620	Masala Mango Chiller	masala-mango-chiller	\N	\N	VEGAN	120.00	f	\N	\N	\N	\N	\N	\N	19	t	f	2026-01-26 10:07:49.776623+00	2026-01-26 10:07:49.776623+00
cb2daee9-c3c7-4a69-b34f-6108ce786964	364e3366-57b2-4dfa-8203-a7f166deb620	Orange Chiller	orange-chiller	\N	\N	VEGAN	120.00	f	\N	\N	\N	\N	\N	\N	20	t	f	2026-01-26 10:07:50.084959+00	2026-01-26 10:07:50.084959+00
16405de4-30de-40dd-9d06-73a81d349abb	152c2b97-2c26-415f-8ab7-587d4a6b4b6d	30 MEALS	30-meals		\N	VEG	5250.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-04-01 14:02:48.861491+00	2026-04-01 14:02:48.861491+00
b8c7a93f-f304-428b-a239-84e3c0aa66a0	152c2b97-2c26-415f-8ab7-587d4a6b4b6d	60 MEALS	60-meals		\N	VEG	9900.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-04-01 14:03:24.287952+00	2026-04-01 14:03:24.287952+00
b9cecf35-bc19-4a19-a541-2e472ef4e096	152c2b97-2c26-415f-8ab7-587d4a6b4b6d	90 MEALS	90-meals		\N	VEG	13950.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-04-01 15:06:18.346483+00	2026-04-01 15:06:18.346483+00
1c5e54de-ed43-4377-8547-9e7003c80da0	889427de-fb27-4ec3-b9f0-004816c8bc24	streamed chk breast	streamed-chk-breast		\N	NON_VEG	150.00	f	\N	\N	\N	\N	\N	\N	0	t	f	2026-04-03 14:51:36.915472+00	2026-04-03 14:51:36.915472+00
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, menu_item_id, quantity, unit_price, total_price, variant_ids, addon_selections, special_instructions, created_at, item_name) FROM stdin;
f91bfa30-5fe4-4050-aae3-c10957772424	680ff6b7-8050-4f8d-b77f-272a51fdec89	\N	3	1.00	3.00	[]	[]	\N	2026-04-02 14:16:21.575516+00	MEAL
5ec58bd5-4eed-4363-99d2-4f1c38dbf5e0	c3e2c9bd-01e4-46f3-bc0d-7f1178359dab	653a9800-b1d9-47bb-9999-ac8af255cc5f	1	240.00	240.00	["38b7c9d7-316a-45e3-9358-f9430f53e9a1"]	[]	\N	2026-04-06 15:43:52.624012+00	Robusted Chk Breast
d6d40dc8-1a7d-4e2a-960e-c9839ae23bbf	f70b297f-4dbd-47f5-a7b1-a2b8626621a1	653a9800-b1d9-47bb-9999-ac8af255cc5f	2	240.00	480.00	["38b7c9d7-316a-45e3-9358-f9430f53e9a1"]	[]	\N	2026-04-08 13:42:17.946377+00	Robusted Chk Breast
5daeeacc-d187-4f91-8e86-1beceeb3084e	2493e535-7c89-4a7a-abdb-97ff4f251a23	d893232c-bbbb-4968-8bf8-db2dcb81ad8b	1	250.00	250.00	["3bf7e2d9-b533-4024-b853-658bf812bc98"]	[]	\N	2026-04-10 11:14:58.338883+00	Grilled Paneer with Rice
e3800492-d680-46e7-87d2-4aeb6665505a	2493e535-7c89-4a7a-abdb-97ff4f251a23	0be76145-ce83-494b-9dc6-258242875da1	1	130.00	130.00	[]	[]	\N	2026-04-10 11:14:58.338883+00	Peanut Butter Egg Smoothie
d8289f48-9ccb-4b46-b142-a008ef76e404	d81e75a6-d8ac-4941-a402-41946eeca960	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	180.00	180.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-04-10 13:24:26.95643+00	Grilled Chk Breast
960a9e40-b28b-4eb3-bf3a-6d7cd1939fd0	5bd102b1-0bf3-4084-902d-817c86d6fb1d	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	180.00	180.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-04-14 11:40:08.949212+00	Grilled Chk Breast
9a927396-1153-4123-9cf2-bf8e79ec19e1	5bd102b1-0bf3-4084-902d-817c86d6fb1d	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-14 11:40:08.949212+00	Veg Protein Bowl
6c17427b-dee1-461d-ab09-63ac83aba601	5bd102b1-0bf3-4084-902d-817c86d6fb1d	062016cc-4f65-47c6-91f9-094919acc7ad	1	110.00	110.00	[]	[]	\N	2026-04-14 11:40:08.949212+00	Peanut Butter Banana
5d7ce0c4-86d1-4efe-9103-18c647c55b59	41c0d93a-60ef-464f-910e-9b215096771a	fe0cb6ba-d0a7-46ee-ace4-aca60314463a	1	160.00	160.00	["50522a77-5987-4318-9352-1e5390b874a2"]	[]	\N	2026-04-16 10:42:16.97707+00	Non Veg Protein Bowl
1e3ed7eb-4ef5-4610-b1f7-8b6145e4d7e8	d3555aed-65f7-44c2-a980-98c736a97d20	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-04-16 13:51:02.454289+00	Grilled Paneer
eb73e0a3-319d-4322-bcea-919f37d77b80	eb38d077-8f6d-43bd-ad1a-04b1ef781057	653a9800-b1d9-47bb-9999-ac8af255cc5f	1	240.00	240.00	["38b7c9d7-316a-45e3-9358-f9430f53e9a1"]	[]	\N	2026-04-22 14:44:19.492732+00	Robusted Chk Breast
3d194a8b-960d-45e5-a8af-bfc6ff51e285	0d1ad374-d94d-42cc-b0d3-289419c5b9d9	653a9800-b1d9-47bb-9999-ac8af255cc5f	2	240.00	480.00	["38b7c9d7-316a-45e3-9358-f9430f53e9a1"]	[]	\N	2026-04-04 14:54:03.115983+00	Robusted Chk Breast
af6b07bc-2a2b-4ad4-af61-3ef842b5cd9f	ef75ea9c-559b-42c5-9caa-d37cbca2a6c3	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	210.00	210.00	["b08149bc-ffee-4c91-bea6-da655c166b9e"]	[]	\N	2026-04-07 14:52:55.859309+00	Grilled Chk Breast
02f14a27-2a88-4ef2-89e9-7ef601bba972	84240672-49c9-4d3d-9cfd-abe10d8dcf23	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-08 13:47:22.474767+00	Veg Protein Bowl
0dcccded-185f-46d9-bef3-a2a6c5c465aa	03d3f07b-33fb-4f6b-8b10-3bac630f5c38	0be76145-ce83-494b-9dc6-258242875da1	1	130.00	130.00	[]	[]	\N	2026-04-10 12:43:52.403541+00	Peanut Butter Egg Smoothie
7dc9b55e-d618-4d8c-88f8-59ee2ddd709d	ca3f75e1-765f-4fc9-9d2f-d6a8fe95285d	aa0823ce-faeb-443f-a1af-e2607ec42cea	1	160.00	160.00	[]	[]	\N	2026-04-10 13:39:25.713059+00	Grilled Paneer Wrap
d0aff624-062b-49f9-b6b2-50d80a9c49dc	efc475c6-522d-4fd5-8c00-c8762e0e345e	3f3f3f34-c5fa-45bc-a46f-ec8cb2716fe2	1	170.00	170.00	[]	[]	\N	2026-04-10 13:44:33.012656+00	Grilled Chk Breast Wrap
20bf02c3-4317-4a24-bda5-0d9042c1ff8f	cb290522-49d9-487f-869a-604d24e0bfb8	0be76145-ce83-494b-9dc6-258242875da1	2	150.00	300.00	[]	[]	\N	2026-04-15 14:03:24.965541+00	Peanut Butter Egg Smoothie
b795bef3-b4e5-4815-b55d-4fe7d28501b0	cb290522-49d9-487f-869a-604d24e0bfb8	cbdab46b-7647-46f6-87f3-b07463f1d29c	1	260.00	260.00	[]	[]	\N	2026-04-15 14:03:24.965541+00	Non Veg Quinoa Bowl (Indian)
85dd37f5-4692-472e-b08d-f6e3afb6cd8a	dbe57516-4206-44f9-a795-151a30b4118e	3f3f3f34-c5fa-45bc-a46f-ec8cb2716fe2	1	170.00	170.00	[]	[]	\N	2026-04-15 14:05:16.740152+00	Grilled Chk Breast Wrap
7c537987-5db0-455d-b1f8-d94b3b61443a	dbe57516-4206-44f9-a795-151a30b4118e	996b0ace-1ce5-4ed7-a003-c6ab46b222b5	1	100.00	100.00	[]	[]	\N	2026-04-15 14:05:16.740152+00	Mixed Beans Wrap
372ec8a1-b504-44a6-b205-77ebf871b101	fa9d9873-449e-4d9f-a77b-51321293d8a9	fe0cb6ba-d0a7-46ee-ace4-aca60314463a	2	160.00	320.00	["50522a77-5987-4318-9352-1e5390b874a2"]	[]	\N	2026-04-16 10:44:41.626451+00	Non Veg Protein Bowl
05ed657a-d34d-4581-8aaf-5a1165f88d8a	fa9d9873-449e-4d9f-a77b-51321293d8a9	062016cc-4f65-47c6-91f9-094919acc7ad	1	110.00	110.00	[]	[]	\N	2026-04-16 10:44:41.626451+00	Peanut Butter Banana
539848d8-efb5-4a8d-9f70-8687a40bc123	54f2cb3e-a2ce-44ff-8d0f-a1e4298dc4cf	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	180.00	180.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-04-20 13:19:56.416644+00	Grilled Chk Breast
ed529d08-b82a-42fe-bb5c-9bf617ed6e72	c9d7cfef-bf27-4dd6-ba94-59efc0792d36	3222be3d-1b64-4818-b383-fa2af6cb9180	1	100.00	100.00	[]	[]	\N	2026-04-06 11:29:20.125113+00	Egg Smoothie
eef054fe-da1c-42a3-a197-7230bae53a9e	9f526cfa-837a-4564-beb3-d012e96de125	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-07 15:24:44.371668+00	Veg Protein Bowl
1dd585f2-1ddb-4c80-b3de-370a58622798	592a7455-6591-4379-8f2f-cc5d61dbae9a	a872e54a-b4a3-4242-b972-042d139b9fda	2	250.00	500.00	["dd474827-c336-4e6a-ac93-f3eea4150427"]	[]	\N	2026-04-08 14:19:30.558201+00	Robusted Paneer
0eb89a0b-78d2-4cd0-b8cc-f7fbba62b546	592a7455-6591-4379-8f2f-cc5d61dbae9a	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	210.00	210.00	["dee854fa-4f03-42f6-b820-2044c35628f3"]	[]	\N	2026-04-08 14:19:30.558201+00	Grilled Paneer
f535dde8-9fee-4c36-98a7-19940bbf9a50	112c79fa-1131-49e2-bdea-63964eaea10d	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	210.00	210.00	["b08149bc-ffee-4c91-bea6-da655c166b9e"]	[]	\N	2026-04-10 12:44:51.083724+00	Grilled Chk Breast
9610e058-09e7-4324-af21-69423a19d93d	0ffd995b-ced2-4b7c-9593-ce41234dbb00	38008f78-4964-4c08-a575-638d4365d94b	1	200.00	200.00	["2bc5d403-6fb1-4bca-88a9-5816a6295fda"]	[]	\N	2026-04-10 14:39:30.292125+00	Non Veg Quinoa Bowl
8f857086-3868-4a70-b70a-fc2a0f8c8e18	490902f5-449e-4158-8533-e8dd5a2f1c19	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	210.00	210.00	["dee854fa-4f03-42f6-b820-2044c35628f3"]	[]	\N	2026-04-15 14:40:42.303621+00	Grilled Paneer
b120b47c-76a9-4562-83ec-d6eed889cd57	8bccaeb3-2dd7-4acd-98ac-15549f128095	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-16 10:47:25.789444+00	Veg Protein Bowl
dad97e43-5a10-4b87-ae07-fd4ca82569c6	8bccaeb3-2dd7-4acd-98ac-15549f128095	aa0823ce-faeb-443f-a1af-e2607ec42cea	1	160.00	160.00	[]	[]	\N	2026-04-16 10:47:25.789444+00	Grilled Paneer Wrap
cc8d935b-b411-421f-a921-cc65134ec92e	369b1e53-9eda-41ba-8884-0a8b0f2b16f4	3f3f3f34-c5fa-45bc-a46f-ec8cb2716fe2	1	170.00	170.00	[]	[]	\N	2026-04-21 15:30:31.674063+00	Grilled Chk Breast Wrap
13dab3b1-2d4d-42d7-bada-d759bca721c3	369b1e53-9eda-41ba-8884-0a8b0f2b16f4	b6d4e95d-8862-493b-b4c2-98d796bf17e6	2	140.00	280.00	["2123c472-1e2e-466c-8e9e-95504ed13040"]	[]	\N	2026-04-21 15:30:31.674063+00	Rice Noodles
11f29f7a-8235-4471-870f-0ea5674c8cae	02fed924-2242-46b2-8942-741b83de6046	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-01-28 05:31:40.017375+00	Grilled Paneer
fe0ab11b-45f0-4224-94f9-125266e00e19	a045359f-8520-4b13-9b96-570ad8bf6b47	a872e54a-b4a3-4242-b972-042d139b9fda	1	220.00	220.00	["12bf4b6e-fedb-41e5-9655-f4cd4b3b2e89"]	[]	\N	2026-01-28 07:49:55.906658+00	Robusted Paneer
2b4d152b-3ac0-46e7-ae08-c7c67579550f	03bae5ac-9162-4d8b-a6ff-a4d5f2974c22	b7520834-6278-4c01-ab3f-aa227d4c9534	1	320.00	320.00	["033b5cfb-8a93-47dd-9abc-ff9a8f8f5d22"]	[]	\N	2026-01-28 11:13:07.272409+00	Grilled Fish
1d94c0bc-d4a0-4d2c-9e6e-b057144b7975	e2cf503a-e24d-4532-85fe-4a0c15fc3710	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	250.00	250.00	["0d7b1bea-4117-423d-9438-0a5bb4c285b9"]	[]	\N	2026-01-28 11:16:46.657186+00	Veg Protein Bowl
7e6ae93d-a89f-4034-9f7a-a39c0b4d7c6e	4968276b-4599-47de-9857-6e2eabec45e5	a872e54a-b4a3-4242-b972-042d139b9fda	1	220.00	220.00	["12bf4b6e-fedb-41e5-9655-f4cd4b3b2e89"]	[]	\N	2026-01-28 15:33:34.265146+00	Robusted Paneer
13e5afee-e70b-431b-b8e4-1ab899990bc9	21873951-1b2b-4a5b-94bd-8985fcc068e2	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	210.00	210.00	["dee854fa-4f03-42f6-b820-2044c35628f3"]	[]	\N	2026-01-29 09:49:31.753335+00	Grilled Paneer
1daba0be-948d-406e-9673-721a5832ea87	932a1c81-31eb-455c-bfba-7eb53809a3f5	a872e54a-b4a3-4242-b972-042d139b9fda	1	520.00	520.00	["c7226ee0-c3cf-43c3-b31d-8bd50c7b803b", "12bf4b6e-fedb-41e5-9655-f4cd4b3b2e89"]	[]	\N	2026-01-29 10:22:54.709741+00	Robusted Paneer
2c91a8cd-ce4e-4b9f-ae17-a5eccb234d65	932a1c81-31eb-455c-bfba-7eb53809a3f5	a872e54a-b4a3-4242-b972-042d139b9fda	1	520.00	520.00	["c7226ee0-c3cf-43c3-b31d-8bd50c7b803b", "12bf4b6e-fedb-41e5-9655-f4cd4b3b2e89"]	[]	\N	2026-01-29 10:22:54.709741+00	Robusted Paneer
dc0ba87c-0a85-44a4-9c1f-02d097b388ad	832ac525-301b-4b8a-b11d-55072e590990	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	240.00	240.00	["30f24e06-cfc0-4adf-aa3a-16b7351b4725"]	[]	\N	2026-01-29 10:30:14.424983+00	Grilled Chk Breast
8e604e7a-53c3-4e71-a73e-d4460ed3ff71	c757661e-fd5d-41d6-b11e-f0e61d91dea8	31769c76-e113-4215-ad13-024c957d74fb	1	330.00	330.00	["371bedd5-98f4-4b53-8ef1-fbe083977f5d"]	[]	\N	2026-01-29 14:49:30.223297+00	Veg Quinoa Bowl
b61646dc-91e6-4775-84c6-c45325d0d16a	fb3f2903-b042-4ddc-842d-f32eb7b38e6a	a872e54a-b4a3-4242-b972-042d139b9fda	1	150.00	150.00	["dd474827-c336-4e6a-ac93-f3eea4150427"]	[]	\N	2026-01-29 15:19:34.16157+00	Robusted Paneer
3dd3fff3-e724-49ef-ab6e-bf6926fd507a	d4677573-f230-4b06-a5a6-f78a46cf21d9	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-01-30 06:52:41.220672+00	Grilled Paneer
f2d07028-a137-429e-afa6-29099de56896	f6563197-987a-409b-a82c-b30382ea76e6	a872e54a-b4a3-4242-b972-042d139b9fda	1	220.00	220.00	["12bf4b6e-fedb-41e5-9655-f4cd4b3b2e89"]	[]	\N	2026-01-30 07:52:16.628532+00	Robusted Paneer
fef3b7e4-be7c-4e61-9ee2-ed6a6a73bf10	7668b1b6-8878-476e-9f8c-71863b4ee3a6	53cd72f2-2f69-4746-9274-ec998c5472f8	1	160.00	160.00	[]	[]	\N	2026-01-31 09:56:12.195966+00	Eggitarian Brown Rice Bowl
b2da008c-6ed0-4904-a60a-74b28dac3907	7668b1b6-8878-476e-9f8c-71863b4ee3a6	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	270.00	270.00	["dee854fa-4f03-42f6-b820-2044c35628f3"]	[{"addonId": "38923adb-b42c-4264-887b-e106502074cf", "quantity": 1}]	\N	2026-01-31 09:56:12.195966+00	Grilled Paneer
473d2f5a-3ac6-415d-a675-d1aab94ca154	6dc8a776-b151-4053-b710-cb5e7729dfd3	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	180.00	180.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-02-03 14:04:38.309309+00	Grilled Chk Breast
cb50c450-bcbf-4864-ade1-eeb31d100947	3aba4f3b-b2fa-43ed-9e0f-1a52f52d9d6c	38008f78-4964-4c08-a575-638d4365d94b	1	350.00	350.00	["9c60aac6-3448-45a3-b286-1ba72b50cbee"]	[]	\N	2026-02-03 14:05:39.365103+00	Non Veg Quinoa Bowl
aec56512-4ba1-466f-8945-688ce6f35539	012e9b8a-5a47-4bd4-8a49-df8a146c5d5c	3222be3d-1b64-4818-b383-fa2af6cb9180	1	100.00	100.00	[]	[]	\N	2026-02-03 14:06:31.268189+00	Egg Smoothie
75ce409f-0cab-40cc-b4ce-0bde9ec41936	d4c5124b-6ed4-46ea-980c-d480d3ba35eb	3222be3d-1b64-4818-b383-fa2af6cb9180	1	100.00	100.00	[]	[]	\N	2026-02-03 14:07:19.34247+00	Egg Smoothie
7dcf95cc-2ef8-4cb0-95d6-2315a3cb1363	85d869a5-b261-46a4-bbaa-d659a1537522	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	240.00	240.00	["30f24e06-cfc0-4adf-aa3a-16b7351b4725"]	[]	\N	2026-02-03 14:08:05.709147+00	Grilled Chk Breast
66b02cdc-c659-4d01-8d47-30416ff11af1	6b6041a8-e18e-43e4-b8d2-61cd1a24e210	3222be3d-1b64-4818-b383-fa2af6cb9180	1	100.00	100.00	[]	[]	\N	2026-02-03 14:09:40.856911+00	Egg Smoothie
5482157a-032c-479b-9af6-7e5a564fcf2c	898144f1-d22b-4e52-b16a-46e5a2bb5456	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-02-03 14:09:57.098591+00	Veg Protein Bowl
80beafcf-6e47-4da8-b61d-2b4228b6540b	df8db34e-6a9e-4e45-948e-1df1298a4c52	76453f80-e7b2-4e52-b52d-ec2de2f78c79	2	240.00	480.00	["30f24e06-cfc0-4adf-aa3a-16b7351b4725"]	[]	\N	2026-02-03 14:10:44.120831+00	Grilled Chk Breast
664bacf9-37d4-4d4c-b81c-0873c53ecf67	df8db34e-6a9e-4e45-948e-1df1298a4c52	3222be3d-1b64-4818-b383-fa2af6cb9180	1	100.00	100.00	[]	[]	\N	2026-02-03 14:10:44.120831+00	Egg Smoothie
d3d87745-4237-45a0-8551-8310d695bb5c	ded49685-6dfd-40d7-9d08-fed13f77169e	3f3f3f34-c5fa-45bc-a46f-ec8cb2716fe2	1	170.00	170.00	[]	[]	\N	2026-02-03 14:11:13.227014+00	Grilled Chk Breast Wrap
c0b1c388-1def-4f5d-9254-67c3de95ba68	6dc00138-9273-4081-9c84-cab7fe1f2fae	0be76145-ce83-494b-9dc6-258242875da1	1	150.00	150.00	[]	[]	\N	2026-02-03 14:11:38.105215+00	Peanut Butter Egg Smoothie
909262cc-d0b3-4503-be47-34fe1feca2c8	8517cb95-2584-4794-ace5-dc6ff0a26442	30e1ee6f-e12d-4126-a22b-7103e18ad57f	1	270.00	270.00	["12935961-fc58-43ff-ae83-e7bc35b3e3cd"]	[]	\N	2026-02-03 14:13:16.182147+00	Grilled Chest with Rice
ab521fe6-7ff6-4b38-823a-e3546d91c842	04558fc6-575b-42f0-86ba-5f9e34d345d3	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-02-03 14:13:34.927126+00	Veg Protein Bowl
34cf3122-3a21-449c-bc39-cc4236d3b567	a8804faa-24eb-44df-bdd4-35f7f093105c	3f3f3f34-c5fa-45bc-a46f-ec8cb2716fe2	1	170.00	170.00	[]	[]	\N	2026-04-02 15:13:50.008799+00	Grilled Chk Breast Wrap
0051aa8f-3140-407e-bb5d-d23a0e9edc02	e67f8624-b67e-4e69-8c6d-5a8979096e75	7d2e5471-e564-4a16-9a2a-1274ebc417fc	2	150.00	300.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-02-03 14:14:01.714305+00	Veg Protein Bowl
fdb12719-4063-436d-ad23-7d9684e1bd1d	83947941-b749-4896-957e-2a682b523ea4	b3bae653-761d-4acb-8ee1-2d9896e6e5dd	2	120.00	240.00	[]	[]	\N	2026-02-03 14:15:04.123764+00	Tofu Wrap
cffd2e40-6bbc-4332-994d-33ad4fe861c6	a6a6e407-38d9-42b8-ad64-2f97994d7bf5	b3bae653-761d-4acb-8ee1-2d9896e6e5dd	1	120.00	120.00	[]	[]	\N	2026-02-03 14:16:22.718057+00	Tofu Wrap
dc38add0-3a2b-4de3-a63a-1de3a681eb45	5b5a251e-e608-43bf-a9be-da535ac77097	d893232c-bbbb-4968-8bf8-db2dcb81ad8b	1	250.00	250.00	["3bf7e2d9-b533-4024-b853-658bf812bc98"]	[]	\N	2026-02-03 14:17:01.611941+00	Grilled Paneer with Rice
5913aea0-cfb3-4e42-af27-53d99f52870c	e29c5dcc-8f7b-4d8d-bb35-35a438b6b27e	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	240.00	240.00	["30f24e06-cfc0-4adf-aa3a-16b7351b4725"]	[]	\N	2026-02-03 14:17:53.07216+00	Grilled Chk Breast
ba22964e-0d5a-49ca-b323-58ae83108dd5	416d322e-3bc2-4b23-8bb0-56410a1a39c2	31be4805-5e36-47ac-a41d-d8480274a38c	1	170.00	170.00	[]	[]	\N	2026-02-03 14:18:06.617322+00	Egg White Salad
33eced52-ffb2-4452-99f9-f852d258d73c	ffb366c5-b72a-4b63-b830-0e41b064f442	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	180.00	180.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-02-03 14:18:28.287155+00	Grilled Chk Breast
87bddf82-c140-4613-a740-8157d8495f0c	c8d06d15-5e32-4339-8f52-1fe36503203e	7f029ec1-80eb-407b-a490-588c07acc83d	1	100.00	100.00	[]	[]	\N	2026-02-03 14:19:07.510233+00	Vegan Delite Sandwich
c26840d1-c1a4-4edd-99bb-c17388b1ae23	2b24dbb6-c319-4e55-aeb3-38d456e9fa3f	60db4305-abb4-488c-b0b1-de61bb69f0c2	1	210.00	210.00	["8fb0c283-92e9-4c6c-96e6-b1c76db2039f"]	[{"addonId": "10736cd6-2240-4908-9404-0b0534d18013", "quantity": 1}]	\N	2026-02-03 14:19:42.138179+00	Whole Wheat Spaghetti
de859ab3-358e-424d-9871-519aabdd1b85	a8644ac1-e0cf-464d-928f-0204f3699380	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-02-03 14:20:08.035341+00	Veg Protein Bowl
ac8e09df-1a47-49b4-89e0-71e5ce4d0e7a	93740e89-1ca3-43de-aba9-e1f26f366c78	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-02-03 14:20:29.97293+00	Veg Protein Bowl
d91b9ce1-30a9-4c67-89d3-d88286ffb9b6	0076d71c-923c-4ef1-956c-f896d6f0cac1	996b0ace-1ce5-4ed7-a003-c6ab46b222b5	1	100.00	100.00	[]	[]	\N	2026-02-03 14:20:43.757982+00	Mixed Beans Wrap
f8449ee5-bcd0-4906-a07a-adb9da7120a5	2ce06549-d28a-4b56-9431-39bb102f5725	9465888d-aebc-4c5b-83b3-466d4110942d	1	280.00	280.00	["7f6f544a-8a61-4162-b53d-5673ddc79ad9"]	[{"addonId": "10736cd6-2240-4908-9404-0b0534d18013", "quantity": 1}]	\N	2026-02-03 14:37:06.160257+00	Whole Wheat Pasta
54826d0b-ade5-4913-984b-c577327adac6	cac1e02a-aee1-42b8-9a5f-647ab90ead1f	c31202e4-5b92-42ec-b9a7-432777b043d3	1	400.00	400.00	["4378372a-6ed8-49b6-8f2c-70b14c9833c3"]	[]	\N	2026-02-03 14:40:49.0822+00	Grilled Thigh with Rice
94e4d737-d02e-4c07-8184-c806b8ac6fea	cac1e02a-aee1-42b8-9a5f-647ab90ead1f	3c7263e8-2e63-4790-b63e-1cbd32376d94	1	330.00	330.00	["88c9d812-b405-4298-8dc1-32b5639165c2"]	[]	\N	2026-02-03 14:40:49.0822+00	Robusted Paneer with Rice
87b8bc4c-04c3-4cd0-9d0c-5a638b55b498	cac1e02a-aee1-42b8-9a5f-647ab90ead1f	52978b9e-14ed-4334-ad8e-3f844f494068	1	70.00	70.00	[]	[]	\N	2026-02-03 14:40:49.0822+00	Lemonade
2c1e8d66-9250-479e-9742-1f6fe30aea02	357b03fd-1b3a-4570-98ec-f5ffc98a0562	3f3f3f34-c5fa-45bc-a46f-ec8cb2716fe2	1	170.00	170.00	[]	[]	\N	2026-02-03 15:02:13.491662+00	Grilled Chk Breast Wrap
05c1f2ee-9665-42da-8d2d-e0c4875c5bcc	06e969de-f502-4047-91a4-8a802fdc0e7b	3222be3d-1b64-4818-b383-fa2af6cb9180	2	100.00	200.00	[]	[]	\N	2026-02-03 15:15:56.211485+00	Egg Smoothie
ea1cfaab-2152-4bac-9284-d6c3c5ea15a7	ba0d4df4-a092-4512-a88e-8b648503b052	3222be3d-1b64-4818-b383-fa2af6cb9180	1	100.00	100.00	[]	[]	\N	2026-02-03 15:16:55.988006+00	Egg Smoothie
993c27c8-b278-4fa2-a860-5599474634bd	75882362-337b-4ff6-8c88-45ee576d876e	38182410-6aff-4152-9b62-d045d5f47374	1	110.00	110.00	["68a50bc0-6956-4e26-9712-1cbef52796f8"]	[]	\N	2026-02-03 15:36:49.601379+00	Vegan Protein Bowl
599892ce-1993-4037-85aa-3fbb4ffcfa42	34e966e3-840e-4903-8d71-d9eedd2eee69	38182410-6aff-4152-9b62-d045d5f47374	1	20.00	20.00	["68a50bc0-6956-4e26-9712-1cbef52796f8"]	[]	\N	2026-02-03 15:37:47.807989+00	Vegan Protein Bowl
e4cea2e2-cb9c-4846-a9d9-610d3c1e1b56	7303a07d-a7d1-41ee-9aa3-53ba013e1518	a872e54a-b4a3-4242-b972-042d139b9fda	1	280.00	280.00	["12bf4b6e-fedb-41e5-9655-f4cd4b3b2e89"]	[{"addonId": "38923adb-b42c-4264-887b-e106502074cf", "quantity": 1}]	\N	2026-02-04 06:21:30.1597+00	Robusted Paneer
d144f1a4-eea0-477f-9aa0-50fea3969422	900658de-03fa-47ec-8ab1-745ba4006ddf	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-03-18 11:33:53.864426+00	Veg Protein Bowl
fe98f28a-602a-477b-89ab-98b355836acf	59225ae3-2425-4089-a25f-50d9ccc9c855	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	210.00	210.00	["b08149bc-ffee-4c91-bea6-da655c166b9e"]	[]	\N	2026-03-18 11:58:30.125907+00	Grilled Chk Breast
2d2f4110-d943-4b3d-8d74-0a3fcd099ef6	59225ae3-2425-4089-a25f-50d9ccc9c855	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	210.00	210.00	["b08149bc-ffee-4c91-bea6-da655c166b9e"]	[]	\N	2026-03-18 11:58:30.125907+00	Grilled Chk Breast
f491c472-479a-4953-9aaa-377c3721c727	c1bc14f6-4837-4ec0-bad6-3f353b5e571c	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-03-18 12:09:31.481157+00	Veg Protein Bowl
92babe72-45fc-4705-b8cc-cb619e94447f	3bf86238-85dd-4c53-bd06-56e29632ec7f	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	250.00	250.00	["0d7b1bea-4117-423d-9438-0a5bb4c285b9"]	[]	\N	2026-03-18 12:53:25.114923+00	Veg Protein Bowl
de807c53-607b-4ca6-bb65-975ad80c4b52	8680c818-e6ee-4b62-a31c-5427f9a37d5d	31769c76-e113-4215-ad13-024c957d74fb	1	190.00	190.00	["a22f8839-6fa7-4897-92d1-7e1778753c16"]	[]	\N	2026-03-20 06:13:36.951696+00	Veg Quinoa Bowl
a9089c62-9c5a-42ea-807f-206a5a52c329	8680c818-e6ee-4b62-a31c-5427f9a37d5d	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	210.00	210.00	["dee854fa-4f03-42f6-b820-2044c35628f3"]	[]	\N	2026-03-20 06:13:36.951696+00	Grilled Paneer
f0174769-03e1-45f9-ad8f-ffb6d3f6cce4	2716b43f-2faf-4ce5-952b-af03c04b5b0d	7159dc0c-5d7f-45d6-9e81-428f8261596a	2	150.00	300.00	[]	[]	\N	2026-03-20 07:10:13.828487+00	Grilled Paneer Submarine
aef1998d-cc59-4ae0-bbfe-308b91b08ec7	505b4403-92ad-4491-802a-6bf935682f45	63af43ea-62a8-45ca-a4a5-d630e38ed1f0	2	130.00	260.00	[]	[]	\N	2026-03-22 04:44:22.404194+00	Energy Booster
1f44c6d1-51ad-40bc-beb1-160c3b6add30	a27d37d1-f82c-4d8c-8322-518a1c46fa0d	63af43ea-62a8-45ca-a4a5-d630e38ed1f0	1	130.00	130.00	[]	[]	\N	2026-03-22 04:44:49.211471+00	Energy Booster
66e0455e-eae7-4830-bece-f5b5940e31ac	ff28bf75-337e-4930-b457-e2d0eab57ece	63af43ea-62a8-45ca-a4a5-d630e38ed1f0	1	130.00	130.00	[]	[]	\N	2026-03-22 04:44:49.212832+00	Energy Booster
f4dc4c0b-1c64-4496-87e2-112bde0c4cf3	c7c06c18-5f03-4783-b878-d116deb207ba	63af43ea-62a8-45ca-a4a5-d630e38ed1f0	1	130.00	130.00	[]	[]	\N	2026-03-22 04:44:50.570585+00	Energy Booster
328662ba-e743-436a-a480-832a350b7801	14440137-ef6f-40ad-a214-b48c072faf47	63af43ea-62a8-45ca-a4a5-d630e38ed1f0	1	130.00	130.00	[]	[]	\N	2026-03-22 04:44:50.624071+00	Energy Booster
8f2918f0-e5ed-489b-9783-37f11dbfc720	b1717c91-6237-4c02-ac58-f993ec26b7f7	63af43ea-62a8-45ca-a4a5-d630e38ed1f0	1	130.00	130.00	[]	[]	\N	2026-03-22 04:44:50.665517+00	Energy Booster
ad4e8771-05a5-46db-8b95-c656e7b8955f	b25993bf-eaea-477a-9e3b-b04892cfbd71	63af43ea-62a8-45ca-a4a5-d630e38ed1f0	1	130.00	130.00	[]	[]	\N	2026-03-22 04:45:10.731811+00	Energy Booster
37e8d813-866b-479e-8a75-6af9655f20e4	741433f9-c5e5-4c2e-baa7-683c48d8bac3	63af43ea-62a8-45ca-a4a5-d630e38ed1f0	1	130.00	130.00	[]	[]	\N	2026-03-22 04:45:11.001092+00	Energy Booster
ebfa42ea-5e31-4f1f-b365-b0dcd41a222c	c7e223ea-5b8f-489a-a09a-dad3f280e522	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-03-22 04:46:40.209244+00	Grilled Paneer
0fb9c49d-2b11-4ba3-bedd-e34be29bda45	e432e22c-1f64-404d-b71c-f60d84415cac	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	120.00	120.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-03-30 14:09:58.424639+00	Grilled Paneer
a0e1bbcb-f023-40fc-9da2-8e55e12b2ed0	3bae1580-738e-4f09-ae95-a76cc8092719	0be76145-ce83-494b-9dc6-258242875da1	1	130.00	130.00	[]	[]	\N	2026-03-30 14:32:22.590393+00	Peanut Butter Egg Smoothie
c6249fad-da55-4b6f-b082-428898678605	49b897c0-9705-4ff9-b4a7-20e401bff9b6	3c7263e8-2e63-4790-b63e-1cbd32376d94	1	300.00	300.00	["d349c395-0221-4102-be41-17a0a03e0236"]	[]	\N	2026-03-30 14:38:21.702282+00	Robusted Paneer with Rice
51fb349c-c510-4ae6-b8ba-4cabf915ba20	639e61ff-f700-4c90-9e2d-a21c8574172f	6de3d433-42fc-4b63-a82b-3ca0651a8bf7	1	170.00	170.00	["ce2949c7-3995-4de8-893d-74f4a3058e3b"]	[]	\N	2026-03-30 14:47:38.927291+00	Veg Burrito Bowl
c8f28981-0ee8-427f-927b-32593e4e9c6b	b3809702-8afe-4106-ac70-985cc526e013	7f46e64c-f0e0-46ba-9063-bcfc87a8a07f	1	140.00	140.00	[]	[]	\N	2026-03-30 14:58:35.486001+00	Brutes Gainer
e3852974-19e5-4090-9ec9-da5a08d0a38b	834138cf-c314-4dbb-9956-d6eb4960d1a2	3222be3d-1b64-4818-b383-fa2af6cb9180	1	100.00	100.00	[]	[]	\N	2026-03-30 15:17:25.1403+00	Egg Smoothie
69e771ba-a064-4d6f-91db-a04c3d62f108	834138cf-c314-4dbb-9956-d6eb4960d1a2	3222be3d-1b64-4818-b383-fa2af6cb9180	2	100.00	200.00	[]	[]	\N	2026-03-30 15:17:25.1403+00	Egg Smoothie
7e77344e-dc31-41b5-9a2e-cf46caaeddb8	04894e98-8b4e-4a19-9347-07bb1b552cef	91f55495-7b1f-48a9-acb9-dbed8a624f18	1	160.00	160.00	[]	[]	\N	2026-03-30 15:35:25.276709+00	Mixed Beans Salad
55ee7764-b0eb-46e6-8c79-d0965bb1bcce	79747488-a713-4a2b-bb61-aab2f96c109a	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-03-30 16:00:37.759014+00	Grilled Paneer
ecbae99a-fdbf-4f51-983a-d838e3b17cdb	79747488-a713-4a2b-bb61-aab2f96c109a	31769c76-e113-4215-ad13-024c957d74fb	1	190.00	190.00	["a22f8839-6fa7-4897-92d1-7e1778753c16"]	[]	\N	2026-03-30 16:00:37.759014+00	Veg Quinoa Bowl
081e5881-ec7e-4ea9-9957-c00ab73446cf	79747488-a713-4a2b-bb61-aab2f96c109a	d9b6c4cb-4650-4356-a0a1-57eb996c7ced	1	280.00	280.00	[]	[]	\N	2026-03-30 16:00:37.759014+00	Double Leg Quarters
9b7924a7-3192-41e9-82c5-5a4782d76b69	5f4137e7-2348-4ed1-8883-8f76ae555f64	b7520834-6278-4c01-ab3f-aa227d4c9534	1	280.00	280.00	["081c42de-52c0-4f83-856d-782da7f0ba1a"]	[]	\N	2026-03-31 16:04:03.208612+00	Grilled Fish
380940f2-a632-48ed-94ef-e7429356f961	52b3d679-9241-49d0-a5a0-782b7d58a6f9	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-01 09:52:12.399081+00	Veg Protein Bowl
0ec885ee-fcdf-432a-bbb2-b2960e063047	52b3d679-9241-49d0-a5a0-782b7d58a6f9	31769c76-e113-4215-ad13-024c957d74fb	1	190.00	190.00	["a22f8839-6fa7-4897-92d1-7e1778753c16"]	[]	\N	2026-04-01 09:52:12.399081+00	Veg Quinoa Bowl
e7a85fc6-46ea-4cfb-91c5-8bacbccdac78	8250f1a3-21b4-41bb-9943-b38b4177ab19	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-01 11:32:38.677807+00	Veg Protein Bowl
36c330a4-7fd7-405f-a1f4-ed5cd8b0d0da	8250f1a3-21b4-41bb-9943-b38b4177ab19	0be76145-ce83-494b-9dc6-258242875da1	1	150.00	150.00	[]	[]	\N	2026-04-01 11:32:38.677807+00	Peanut Butter Egg Smoothie
9bd03d3f-3314-477e-84e1-4cc91e373e19	2c49fa61-eb1c-4a48-bf82-e6d978a2af6e	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	210.00	210.00	["b08149bc-ffee-4c91-bea6-da655c166b9e"]	[]	\N	2026-04-01 11:58:39.504053+00	Grilled Chk Breast
ca490d08-4793-483e-a49b-c4cb326285b2	5855dd37-8d72-4fbc-af42-ae4173370647	38182410-6aff-4152-9b62-d045d5f47374	1	100.00	100.00	["68a50bc0-6956-4e26-9712-1cbef52796f8"]	[]	\N	2026-04-01 12:01:25.532164+00	Vegan Protein Bowl
713f35ba-7a27-4823-9ddd-5365bcea9897	4bced266-e7d9-4e0d-b836-8d40c1be7ba2	a872e54a-b4a3-4242-b972-042d139b9fda	1	5250.00	5250.00	["c7226ee0-c3cf-43c3-b31d-8bd50c7b803b"]	[]	\N	2026-04-01 13:23:34.943679+00	Robusted Paneer
4f6b6294-1878-47b3-a3e7-14a802422f43	38232373-65a5-42bb-b51b-98c746cbb73b	76453f80-e7b2-4e52-b52d-ec2de2f78c79	2	240.00	480.00	["30f24e06-cfc0-4adf-aa3a-16b7351b4725"]	[]	\N	2026-04-01 13:49:06.103586+00	Grilled Chk Breast
b89f4f0c-9577-4942-bfd9-8183353dba1e	0e15fe9a-54e0-4039-9428-922e8b4f3001	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	210.00	210.00	["dee854fa-4f03-42f6-b820-2044c35628f3"]	[]	\N	2026-04-01 14:05:02.663521+00	Grilled Paneer
10cfb170-6030-4b30-a8b3-1b092657e6c1	13cc6d81-de58-4ae2-b687-6de663ff378a	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	180.00	180.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-04-01 14:49:46.48163+00	Grilled Chk Breast
5251de1f-ff5f-4af4-b02e-f19b617c5121	13cc6d81-de58-4ae2-b687-6de663ff378a	b3bae653-761d-4acb-8ee1-2d9896e6e5dd	1	120.00	120.00	[]	[]	\N	2026-04-01 14:49:46.48163+00	Tofu Wrap
b866c398-8b88-46bd-ad7a-32d8970a0648	a05560ee-4c3a-47dc-b18e-5451f2ad0722	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	150.00	150.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-04-01 14:50:22.381775+00	Grilled Chk Breast
eac842cb-4791-465b-b0dc-8dd593cd6aa6	a77fdee5-96a6-45db-b130-3d6b2b428d13	3222be3d-1b64-4818-b383-fa2af6cb9180	3	100.00	300.00	[]	[]	\N	2026-04-01 15:21:21.79202+00	Egg Smoothie
64824aab-7d7b-43c3-a820-2314161cb3c8	925993a6-20a9-4593-ab21-3d3ee527b596	3222be3d-1b64-4818-b383-fa2af6cb9180	3	100.00	300.00	[]	[]	\N	2026-04-01 15:21:33.185654+00	Egg Smoothie
5e8fac9b-938e-4a76-a3cd-fe37b03db350	4f186972-5762-4278-9bda-c91040959f69	3222be3d-1b64-4818-b383-fa2af6cb9180	3	0.00	0.00	[]	[]	\N	2026-04-01 15:25:36.577811+00	Egg Smoothie
efbc796d-20d4-42e4-b521-6ecd7591b62c	4f186972-5762-4278-9bda-c91040959f69	3f3f3f34-c5fa-45bc-a46f-ec8cb2716fe2	1	170.00	170.00	[]	[]	\N	2026-04-01 15:25:36.577811+00	Grilled Chk Breast Wrap
37785562-dfab-4d1f-9f6e-b5fd51d0ede3	a1c015c1-9a13-4039-8279-f9bfb195f51e	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	210.00	210.00	["b08149bc-ffee-4c91-bea6-da655c166b9e"]	[]	\N	2026-04-01 15:30:20.562387+00	Grilled Chk Breast
cb5ad3be-a745-4c43-b8ec-fd5fba8787c7	9041c8e3-a16a-4645-8e1f-4fafa424aed4	3222be3d-1b64-4818-b383-fa2af6cb9180	3	40.00	120.00	[]	[]	\N	2026-04-01 15:59:42.718408+00	Egg Smoothie
809a436c-cd4a-4d95-b9c8-e81ddbc87869	9041c8e3-a16a-4645-8e1f-4fafa424aed4	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	180.00	180.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-04-01 15:59:42.718408+00	Grilled Chk Breast
3d39ee8e-84a0-4a38-82c8-d3e093809b3c	3b0872d0-d7b8-481f-8ed2-af5122f8f01c	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	240.00	240.00	["30f24e06-cfc0-4adf-aa3a-16b7351b4725"]	[]	\N	2026-04-02 11:25:44.748251+00	Grilled Chk Breast
9ceab39a-e2f4-4e9c-939d-ddd954ad0bdf	ed0bffdf-9f89-4130-b01e-58bfd13e0c31	3222be3d-1b64-4818-b383-fa2af6cb9180	1	100.00	100.00	[]	[]	\N	2026-04-02 11:27:20.756732+00	Egg Smoothie
50a80fd5-9e53-4098-a86d-1cf960c23fe9	83b98592-8abc-4892-ad6c-4ffe6578c4ee	653a9800-b1d9-47bb-9999-ac8af255cc5f	1	240.00	240.00	["32f7fdd8-20f7-4a2b-b386-45f45ba09517"]	[]	\N	2026-04-02 11:32:43.226341+00	Robusted Chk Breast
b80f1184-abe5-42d5-9651-647dfdd087c6	0d93aff5-3765-4ffd-b54f-7fb14515483f	91f55495-7b1f-48a9-acb9-dbed8a624f18	1	160.00	160.00	[]	[]	\N	2026-04-02 12:32:18.567222+00	Mixed Beans Salad
f1bf4638-5ca9-4599-ae4a-6a147e7b83fe	0d93aff5-3765-4ffd-b54f-7fb14515483f	78c1a614-663f-4849-8894-58cfa6cf1a22	1	120.00	120.00	[]	[]	\N	2026-04-02 12:32:18.567222+00	Popeyes Smoothie
f439ff1e-9bae-4d33-bcf9-d94db9bab30f	5d05c323-9c60-4215-8419-cbf1dbb5f70d	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-02 12:43:31.336816+00	Veg Protein Bowl
193bd829-91bc-4891-82a4-36ccf02fed10	2fbe296c-4b86-4eb0-9f5a-a2457e947c21	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-04-02 14:10:04.156254+00	Grilled Paneer
ee4a3a5a-4c50-4fb2-ab67-fef384cc21c4	2fbe296c-4b86-4eb0-9f5a-a2457e947c21	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	180.00	180.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-04-02 14:10:04.156254+00	Grilled Chk Breast
13b51b80-5da4-4777-b376-54be84d67782	4a55c61a-1344-48be-9ea0-99b4a370aa0d	3222be3d-1b64-4818-b383-fa2af6cb9180	1	100.00	100.00	[]	[]	\N	2026-04-02 14:12:15.611708+00	Egg Smoothie
14e4237c-0eaa-4707-b909-11ab71fded00	6a6355ee-7d57-4d17-973e-28b678cd41d1	16405de4-30de-40dd-9d06-73a81d349abb	1	3000.00	3000.00	[]	[]	\N	2026-04-02 14:19:01.400475+00	30 MEALS
a33b40c5-ce36-4117-a335-bcf804d84fec	6a6355ee-7d57-4d17-973e-28b678cd41d1	16405de4-30de-40dd-9d06-73a81d349abb	1	5250.00	5250.00	[]	[]	\N	2026-04-02 14:19:01.400475+00	30 MEALS
bd022365-1584-4602-99c2-64918b9b691c	9ab49967-722a-4b57-bd10-73d91be82841	16405de4-30de-40dd-9d06-73a81d349abb	1	3000.00	3000.00	[]	[]	\N	2026-04-02 14:20:12.011376+00	30 MEALS
5d78d1ec-b44b-4110-8820-463ae3854ea1	302f8c46-33ca-4255-aa06-8fd3210f23c3	38182410-6aff-4152-9b62-d045d5f47374	1	0.00	0.00	["68a50bc0-6956-4e26-9712-1cbef52796f8"]	[]	\N	2026-04-02 14:51:34.431606+00	Vegan Protein Bowl
3601a31d-9e6d-4df2-95ff-58f5ed486f75	302f8c46-33ca-4255-aa06-8fd3210f23c3	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-04-02 14:51:34.431606+00	Grilled Paneer
dcccb201-90ec-4717-99ab-33a59fb5b7d1	a5b373f7-0a55-4696-a997-b846a6b0a80b	fe0cb6ba-d0a7-46ee-ace4-aca60314463a	1	160.00	160.00	["50522a77-5987-4318-9352-1e5390b874a2"]	[]	\N	2026-04-02 15:17:12.902533+00	Non Veg Protein Bowl
5173433c-95f4-4a9b-97ad-fd9ffe7da01f	d602e00b-88af-44b6-903f-4f730b58ba3c	3222be3d-1b64-4818-b383-fa2af6cb9180	3	100.00	300.00	[]	[]	\N	2026-04-02 15:26:32.897545+00	Egg Smoothie
416a030d-00c8-492f-a681-2cf031e15b8a	a3d0ade0-4593-49ab-8bc2-bbd04bb5de5c	653a9800-b1d9-47bb-9999-ac8af255cc5f	1	240.00	240.00	["38b7c9d7-316a-45e3-9358-f9430f53e9a1"]	[]	\N	2026-04-03 12:17:44.407706+00	Robusted Chk Breast
07e48a3c-58b5-4255-b4cb-b7ea21daa703	dd776b42-75e2-4445-a889-ea9bbe42aa5b	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	210.00	210.00	["b08149bc-ffee-4c91-bea6-da655c166b9e"]	[]	\N	2026-04-03 12:51:50.248567+00	Grilled Chk Breast
7d8a1c22-36a4-4c1d-a13d-fda883208fe1	046dfb35-3381-45ef-98c1-a07286b8ac71	7d2e5471-e564-4a16-9a2a-1274ebc417fc	2	150.00	300.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-03 13:27:36.234546+00	Veg Protein Bowl
bd65af45-93dd-4449-8de8-44875e5254c9	046dfb35-3381-45ef-98c1-a07286b8ac71	7f46e64c-f0e0-46ba-9063-bcfc87a8a07f	1	140.00	140.00	[]	[]	\N	2026-04-03 13:27:36.234546+00	Brutes Gainer
dbc85c7e-dd4c-4852-becb-8ea71c181a72	683082a2-5961-456c-b433-5024a4b067ec	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-04-03 14:31:14.167118+00	Grilled Paneer
cbbb42ee-5b75-4cf8-848b-838ada665b7b	0d68a76b-ba86-42a1-a86e-542689fc1c49	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-04-03 14:31:33.979556+00	Grilled Paneer
afb9b3c6-bb0b-4f24-8657-b0725b92c061	3694acf1-3a15-44b9-be57-6f83c0d01db1	3f3f3f34-c5fa-45bc-a46f-ec8cb2716fe2	1	170.00	170.00	[]	[]	\N	2026-04-03 14:48:37.476442+00	Grilled Chk Breast Wrap
4d213ae1-f4a6-4938-b39c-a7fb8ce69182	cdafbd1e-3e19-4daa-b552-e9de6ad603e1	0be76145-ce83-494b-9dc6-258242875da1	1	150.00	150.00	[]	[]	\N	2026-04-03 14:55:19.181609+00	Peanut Butter Egg Smoothie
e92ed8e4-072f-4ab4-a8c8-d7a6e421639a	c4db938d-ed3c-4195-badb-3292394b3195	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	170.00	170.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-04-03 14:56:07.987843+00	Grilled Chk Breast
43c0c00d-4da5-4088-bddc-8dcf2d02b403	833b27e6-8a48-4e20-9d72-96954f6c1bb8	0be76145-ce83-494b-9dc6-258242875da1	1	130.00	130.00	[]	[]	\N	2026-04-03 15:50:07.122534+00	Peanut Butter Egg Smoothie
d4a3d977-2120-4aca-a890-fe1fc437f524	966af58d-bcb8-4316-a52a-930cc9dc8265	fe0cb6ba-d0a7-46ee-ace4-aca60314463a	2	160.00	320.00	["50522a77-5987-4318-9352-1e5390b874a2"]	[]	\N	2026-04-03 15:59:08.585119+00	Non Veg Protein Bowl
9357d7d2-4184-4392-8040-7a55fa656e4f	f9719581-dbff-4864-9b21-9ae30b4806a0	3222be3d-1b64-4818-b383-fa2af6cb9180	2	100.00	200.00	[]	[]	\N	2026-04-03 15:59:54.064112+00	Egg Smoothie
2241d3cb-1001-451a-8904-2a3e18421b4c	11f641a5-8b84-4ce8-bbda-610f46142d26	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	250.00	250.00	["0d7b1bea-4117-423d-9438-0a5bb4c285b9"]	[]	\N	2026-04-03 16:24:02.409475+00	Veg Protein Bowl
57464ad9-b039-4c9e-99aa-dd90f2647cb9	2f4666a4-e42e-4448-826e-9e9377b4215b	91f55495-7b1f-48a9-acb9-dbed8a624f18	1	160.00	160.00	[]	[]	\N	2026-04-03 16:24:27.683935+00	Mixed Beans Salad
0a7cab11-f58a-423a-97cd-9c0775fdfce5	d2470726-537b-4201-aee5-dcb209f34122	0e71edc8-ad93-42a9-840c-fc9d9b1cbd52	1	120.00	120.00	[]	[]	\N	2026-04-03 16:24:56.708102+00	Bournvita Smoothie
9f9132ac-6179-4eef-a7e5-bd2415c15b84	dd1b98cb-218b-4d77-9ebe-27d773a0f795	e971da9c-0191-4ec4-a3dc-2ed0791a7988	1	90.00	90.00	[]	[]	\N	2026-04-04 14:12:48.317376+00	Cold Coffee
0c405ff3-113d-47ab-b4c1-7c778e14d820	dd1b98cb-218b-4d77-9ebe-27d773a0f795	b6d4e95d-8862-493b-b4c2-98d796bf17e6	1	140.00	140.00	["2123c472-1e2e-466c-8e9e-95504ed13040"]	[]	\N	2026-04-04 14:12:48.317376+00	Rice Noodles
3997c2fe-0cd3-4eba-acab-890354262470	8bf4561d-2dcc-4577-a247-d77bcb7a8445	b6d4e95d-8862-493b-b4c2-98d796bf17e6	1	320.00	320.00	["4c3fb42b-f746-445e-954a-dfbc9d076736"]	[{"addonId": "7eaeb0fc-edad-4922-9573-e1a2573d5a7c", "quantity": 1}]	\N	2026-04-04 14:15:48.175126+00	Rice Noodles
b424e6b4-e358-4594-a55b-2b1726578fcf	8bf4561d-2dcc-4577-a247-d77bcb7a8445	aa0823ce-faeb-443f-a1af-e2607ec42cea	1	160.00	160.00	[]	[]	\N	2026-04-04 14:15:48.175126+00	Grilled Paneer Wrap
2504f1a1-6365-4f3a-900e-77f83406ecbe	8bf4561d-2dcc-4577-a247-d77bcb7a8445	aa0823ce-faeb-443f-a1af-e2607ec42cea	1	160.00	160.00	[]	[]	\N	2026-04-04 14:15:48.175126+00	Grilled Paneer Wrap
928069e8-4b29-421f-9f9b-6cd2e8d1270b	a095d6ef-c4d4-492a-86f0-1cd8ad92930b	76453f80-e7b2-4e52-b52d-ec2de2f78c79	1	180.00	180.00	["9e637340-2bdc-41ee-8cef-3cad5e3e7cd5"]	[]	\N	2026-04-06 15:42:55.153192+00	Grilled Chk Breast
6450d33c-26e7-4596-bdb2-67f46afb7f24	a095d6ef-c4d4-492a-86f0-1cd8ad92930b	7d2e5471-e564-4a16-9a2a-1274ebc417fc	1	150.00	150.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-06 15:42:55.153192+00	Veg Protein Bowl
90e7aa29-a64c-4166-97c5-29feb81c6db9	bac9c8ef-f571-44a9-ad9d-b54aea23c7d0	7d2e5471-e564-4a16-9a2a-1274ebc417fc	2	150.00	300.00	["431c4ee3-5a9c-4110-be55-37147973355a"]	[]	\N	2026-04-08 13:41:52.115565+00	Veg Protein Bowl
a2aa5c5e-ad13-43d7-836c-cd7b078a448e	bac9c8ef-f571-44a9-ad9d-b54aea23c7d0	0be76145-ce83-494b-9dc6-258242875da1	1	150.00	150.00	[]	[]	\N	2026-04-08 13:41:52.115565+00	Peanut Butter Egg Smoothie
1afbdb4e-5274-48b2-b534-17d12d601d43	98b7e658-1762-4cba-8dc1-018031996e79	38008f78-4964-4c08-a575-638d4365d94b	1	200.00	200.00	["2bc5d403-6fb1-4bca-88a9-5816a6295fda"]	[]	\N	2026-04-08 14:46:56.943217+00	Non Veg Quinoa Bowl
ebbf1c2e-9e19-47b2-a39c-74f10cb0c4e5	912cec58-ea2c-4833-a82a-48fb3e0281d2	062016cc-4f65-47c6-91f9-094919acc7ad	1	110.00	110.00	[]	[]	\N	2026-04-10 13:21:58.717653+00	Peanut Butter Banana
f0d3c459-8d67-45ec-82c3-29cd0b41777f	912cec58-ea2c-4833-a82a-48fb3e0281d2	b3bae653-761d-4acb-8ee1-2d9896e6e5dd	1	120.00	120.00	[]	[]	\N	2026-04-10 13:21:58.717653+00	Tofu Wrap
571772d7-2a81-44ff-b25e-ee641a5c6e06	912cec58-ea2c-4833-a82a-48fb3e0281d2	4cd455e3-7b00-4706-8e6b-2bcbc217a48a	1	80.00	80.00	[]	[]	\N	2026-04-10 13:21:58.717653+00	Lemon Soda
e31aeace-0925-4355-9c86-e350be55a29f	42f36d7d-78dc-46aa-a31f-b9bcd7a17392	d93ad0f4-94d2-4a1c-9e1c-121e0536fc93	1	180.00	180.00	["e4fb1779-cca3-4c2d-bc47-4cc61bf544d6"]	[]	\N	2026-04-13 15:12:47.646979+00	Grilled Paneer
26472f3c-dc26-454a-a089-73eafac04be6	6e6830b6-932d-4bec-9fe6-38c62a8ea7e4	9465888d-aebc-4c5b-83b3-466d4110942d	1	300.00	300.00	["7f6f544a-8a61-4162-b53d-5673ddc79ad9"]	[{"addonId": "7eaeb0fc-edad-4922-9573-e1a2573d5a7c", "quantity": 1}]	\N	2026-04-16 10:37:20.79171+00	Whole Wheat Pasta
e74a88e2-316b-4aea-a3ff-4522303add4c	c8454b9c-de39-4ba4-8b97-e08ba0794c11	16405de4-30de-40dd-9d06-73a81d349abb	1	5250.00	5250.00	[]	[]	\N	2026-04-16 10:51:56.249476+00	30 MEALS
86736ce6-ba39-49da-8889-5817c3649128	7b29440d-0ab4-4602-8794-bc72c2d011d1	653a9800-b1d9-47bb-9999-ac8af255cc5f	1	240.00	240.00	["38b7c9d7-316a-45e3-9358-f9430f53e9a1"]	[]	\N	2026-04-21 16:03:01.608651+00	Robusted Chk Breast
\.


--
-- Data for Name: order_number_counters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_number_counters (date_key, counter) FROM stdin;
2026-04-06	3
2026-04-07	2
2026-03-22	9
2026-04-08	5
2026-04-10	8
2026-04-13	1
2026-04-14	1
2026-04-01	14
2026-04-15	3
2026-04-16	6
2026-04-20	1
2026-04-21	2
2026-04-22	1
2026-04-02	14
2026-04-03	14
2026-04-04	3
\.


--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_status_history (id, order_id, previous_status, new_status, changed_by, reason, created_at) FROM stdin;
1	d4677573-f230-4b06-a5a6-f78a46cf21d9	CONFIRMED	CANCELLATION_REQUESTED	d901cbdb-101b-49e3-a421-4d01a572b77a	Customer requested refund due to quality issues	2026-01-30 10:49:13.680896
2	d4677573-f230-4b06-a5a6-f78a46cf21d9	CONFIRMED	CANCELLED	d901cbdb-101b-49e3-a421-4d01a572b77a	Approved: Quality issue confirmed, refunding loyalty points	2026-01-30 10:50:00.978951
3	f6563197-987a-409b-a82c-b30382ea76e6	CONFIRMED	CANCELLATION_REQUESTED	d901cbdb-101b-49e3-a421-4d01a572b77a	Customer changed mind	2026-01-30 10:51:25.549229
4	f6563197-987a-409b-a82c-b30382ea76e6	CONFIRMED	CANCELLED	d901cbdb-101b-49e3-a421-4d01a572b77a	Approved: Customer request approved	2026-01-30 10:51:40.399988
5	fb3f2903-b042-4ddc-842d-f32eb7b38e6a	CONFIRMED	CANCELLATION_REQUESTED	d901cbdb-101b-49e3-a421-4d01a572b77a	Testing rejection flow	2026-01-30 10:52:21.292767
6	fb3f2903-b042-4ddc-842d-f32eb7b38e6a	CANCELLATION_REQUESTED	CONFIRMED	d901cbdb-101b-49e3-a421-4d01a572b77a	Rejected: Order already being prepared	2026-01-30 10:52:43.953529
7	fb3f2903-b042-4ddc-842d-f32eb7b38e6a	CONFIRMED	CANCELLATION_REQUESTED	d901cbdb-101b-49e3-a421-4d01a572b77a	sethgefvzcdaaf	2026-01-30 10:54:38.223482
8	fb3f2903-b042-4ddc-842d-f32eb7b38e6a	CONFIRMED	CANCELLED	d901cbdb-101b-49e3-a421-4d01a572b77a	Approved: rfaafrawfawrf	2026-01-30 10:55:23.360244
9	c757661e-fd5d-41d6-b11e-f0e61d91dea8	CONFIRMED	CANCELLATION_REQUESTED	d901cbdb-101b-49e3-a421-4d01a572b77a	frwadfa	2026-01-30 10:55:53.578511
10	932a1c81-31eb-455c-bfba-7eb53809a3f5	CONFIRMED	CANCELLATION_REQUESTED	d901cbdb-101b-49e3-a421-4d01a572b77a	ewfraqwrefaqewdfa	2026-01-30 11:11:19.148513
11	6a6355ee-7d57-4d17-973e-28b678cd41d1	CONFIRMED	CANCELLATION_REQUESTED	d901cbdb-101b-49e3-a421-4d01a572b77a	WRong order	2026-04-02 14:19:30.71342
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, customer_phone, customer_name, subtotal, tax, total, payment_method, payment_status, notes, created_by, created_at, updated_at, customer_id, location_id, status, cancellation_requested_by, cancellation_requested_at, cancellation_reason, cancelled_by, cancelled_at, customer_package_id, meals_consumed, is_package_order, loyalty_points_redeemed) FROM stdin;
0d1ad374-d94d-42cc-b0d3-289419c5b9d9	ORD-20260404-0003	8882626545	ryan	480.00	0.00	480.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-04 14:54:03.115983+00	2026-04-04 14:54:03.115983+00	e7d0ef97-921c-4207-97ce-117fd680dcab	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
ef75ea9c-559b-42c5-9caa-d37cbca2a6c3	ORD-20260407-0001	9996187544	Simar	210.00	0.00	210.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-07 14:52:55.859309+00	2026-04-07 14:52:55.859309+00	c42f544f-6ea9-4967-9fec-018e95d8c9db	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
2493e535-7c89-4a7a-abdb-97ff4f251a23	ORD-20260410-0001	9316655228	Suchsum	380.00	0.00	380.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-10 11:14:58.338883+00	2026-04-10 11:14:58.338883+00	a2206f02-1376-455b-bfc1-bb87d068b894	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
0ffd995b-ced2-4b7c-9593-ce41234dbb00	ORD-20260410-0008	8284804416	m. dogra	200.00	0.00	200.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-10 14:39:30.292125+00	2026-04-10 14:39:30.292125+00	0657b88a-b69b-469d-8afd-22555e28baa1	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
41c0d93a-60ef-464f-910e-9b215096771a	ORD-20260416-0002	8684048182	Harsh Kumar	160.00	0.00	160.00	CASH	PENDING	\N	217c7097-1140-4918-a56d-e6d913722541	2026-04-16 10:42:16.97707+00	2026-04-16 10:42:16.97707+00	14173abe-f53e-4a23-a88a-9804fa709eac	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
369b1e53-9eda-41ba-8884-0a8b0f2b16f4	ORD-20260421-0001	8054638082	Anmol	450.00	0.00	450.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-21 15:30:31.674063+00	2026-04-21 15:30:31.674063+00	cbe583f3-84c0-4db1-82ad-a1a019150ee2	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
02fed924-2242-46b2-8942-741b83de6046	ORD-20260128-0001	07837733549	rajat Gupta	180.00	0.00	180.00	CASH	PENDING	heloo	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-28 05:31:40.017375+00	2026-04-04 14:41:56.256117+00	\N	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
c9d7cfef-bf27-4dd6-ba94-59efc0792d36	ORD-20260406-0001	8727966718	Birinder	100.00	0.00	100.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-06 11:29:20.125113+00	2026-04-06 11:29:20.125113+00	b3b8d429-ab15-4ba0-ad68-513436d7eba8	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
9f526cfa-837a-4564-beb3-d012e96de125	ORD-20260407-0002	9988884994	Atul	150.00	0.00	150.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-07 15:24:44.371668+00	2026-04-07 15:24:44.371668+00	ce6b48e2-fbe1-4e3f-8864-9705f8db3e1d	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
03d3f07b-33fb-4f6b-8b10-3bac630f5c38	ORD-20260410-0002	7696343400	Ajay Maan	130.00	0.00	130.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-10 12:43:52.403541+00	2026-04-10 12:43:52.403541+00	eb1f578e-f0cc-48b1-9bad-d934198090f3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
42f36d7d-78dc-46aa-a31f-b9bcd7a17392	ORD-20260413-0001	9812550900	Sameer	180.00	0.00	180.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-13 15:12:47.646979+00	2026-04-13 15:12:47.646979+00	0fac967c-7783-44ac-8ca7-99d43bf04679	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	30
fa9d9873-449e-4d9f-a77b-51321293d8a9	ORD-20260416-0003	9877229862	Aaditya	430.00	0.00	430.00	CASH	PENDING	\N	217c7097-1140-4918-a56d-e6d913722541	2026-04-16 10:44:41.626451+00	2026-04-16 10:44:41.626451+00	14ca45da-74e0-4a08-8279-cccbf108e3f4	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
7b29440d-0ab4-4602-8794-bc72c2d011d1	ORD-20260421-0002	8882626545	ryan	240.00	0.00	240.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-21 16:03:01.608651+00	2026-04-21 16:03:01.608651+00	e7d0ef97-921c-4207-97ce-117fd680dcab	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	40
a095d6ef-c4d4-492a-86f0-1cd8ad92930b	ORD-20260406-0002	8437068104	Lovepreet	330.00	0.00	330.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-06 15:42:55.153192+00	2026-04-06 15:42:55.153192+00	7cbd8f64-ad8e-42e5-b012-5d19067c11b2	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
bac9c8ef-f571-44a9-ad9d-b54aea23c7d0	ORD-20260408-0001	7696343400	Ajay Maan	450.00	0.00	450.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-08 13:41:52.115565+00	2026-04-08 13:41:52.115565+00	eb1f578e-f0cc-48b1-9bad-d934198090f3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
112c79fa-1131-49e2-bdea-63964eaea10d	ORD-20260410-0003	9781857530	Aman	210.00	0.00	210.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-10 12:44:51.083724+00	2026-04-10 12:44:51.083724+00	9cf7c204-4818-4adb-a85f-8ecb29cf68fd	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
5bd102b1-0bf3-4084-902d-817c86d6fb1d	ORD-20260414-0001	8295241212	Deepak	440.00	0.00	440.00	UPI	PENDING	\N	217c7097-1140-4918-a56d-e6d913722541	2026-04-14 11:40:08.949212+00	2026-04-14 11:40:08.949212+00	0950625c-50de-4115-a0f3-e96716751c8c	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
8bccaeb3-2dd7-4acd-98ac-15549f128095	ORD-20260416-0004	8559020323	Sarabjeet	310.00	0.00	310.00	CASH	PENDING	\N	217c7097-1140-4918-a56d-e6d913722541	2026-04-16 10:47:25.789444+00	2026-04-16 10:47:25.789444+00	fb948d18-3d03-4514-bdde-58f44bc566c7	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
eb38d077-8f6d-43bd-ad1a-04b1ef781057	ORD-20260422-0001	8882626545	ryan	240.00	0.00	240.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-22 14:44:19.492732+00	2026-04-22 14:44:19.492732+00	e7d0ef97-921c-4207-97ce-117fd680dcab	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a045359f-8520-4b13-9b96-570ad8bf6b47	ORD-20260128-0002	07837733549	rajat Gupta	220.00	0.00	220.00	CARD	PENDING	svfcafsc	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-28 07:49:55.906658+00	2026-04-04 14:41:56.256117+00	\N	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
03bae5ac-9162-4d8b-a6ff-a4d5f2974c22	ORD-20260128-0003	\N	\N	320.00	0.00	320.00	CASH	PENDING	svfdfas	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-28 11:13:07.272409+00	2026-04-04 14:41:56.256117+00	\N	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
e2cf503a-e24d-4532-85fe-4a0c15fc3710	ORD-20260128-0004	07837733549	rajat Gupta	250.00	0.00	250.00	UPI	PENDING	afcadsw	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-28 11:16:46.657186+00	2026-04-04 14:41:56.256117+00	d907c673-e5e0-493c-b33d-703965de87a3	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
4968276b-4599-47de-9857-6e2eabec45e5	ORD-20260128-0005	07837733549	rajat Gupta	220.00	0.00	220.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-28 15:33:34.265146+00	2026-04-04 14:41:56.256117+00	d907c673-e5e0-493c-b33d-703965de87a3	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
21873951-1b2b-4a5b-94bd-8985fcc068e2	ORD-20260129-0001	07837733549	rajat Gupta	210.00	0.00	210.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-29 09:49:31.753335+00	2026-04-04 14:41:56.256117+00	d907c673-e5e0-493c-b33d-703965de87a3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
932a1c81-31eb-455c-bfba-7eb53809a3f5	ORD-20260129-0002	07837733549	rajat Gupta	1040.00	0.00	1040.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-29 10:22:54.709741+00	2026-04-04 14:41:56.256117+00	d907c673-e5e0-493c-b33d-703965de87a3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 11:11:19.148513	ewfraqwrefaqewdfa	\N	\N	\N	0	f	0
832ac525-301b-4b8a-b11d-55072e590990	ORD-20260129-0003	07837733549	rajat Gupta	240.00	0.00	240.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-29 10:30:14.424983+00	2026-04-04 14:41:56.256117+00	d907c673-e5e0-493c-b33d-703965de87a3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
c757661e-fd5d-41d6-b11e-f0e61d91dea8	ORD-20260129-0004	9988505508	Imrose	330.00	0.00	330.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-29 14:49:30.223297+00	2026-04-04 14:41:56.256117+00	6f6f994e-86de-4fdc-9e55-5ab735f9a70f	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 10:55:53.578511	frwadfa	\N	\N	\N	0	f	0
fb3f2903-b042-4ddc-842d-f32eb7b38e6a	ORD-20260129-0005	\N	\N	150.00	0.00	150.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-29 15:19:34.16157+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CANCELLED	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 10:54:38.223482	sethgefvzcdaaf	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 10:55:23.360244	\N	0	f	0
d4677573-f230-4b06-a5a6-f78a46cf21d9	ORD-20260130-0001	07837733549	rajat Gupta	180.00	0.00	180.00	LOYALTY	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 06:52:41.220672+00	2026-04-04 14:41:56.256117+00	d907c673-e5e0-493c-b33d-703965de87a3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CANCELLED	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 10:49:13.680896	Customer requested refund due to quality issues	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 10:50:00.978951	\N	0	f	0
f6563197-987a-409b-a82c-b30382ea76e6	ORD-20260130-0002	07837733549	rajat Gupta	220.00	0.00	220.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 07:52:16.628532+00	2026-04-04 14:41:56.256117+00	d907c673-e5e0-493c-b33d-703965de87a3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CANCELLED	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 10:51:25.549229	Customer changed mind	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-30 10:51:40.399988	\N	0	f	0
7668b1b6-8878-476e-9f8c-71863b4ee3a6	ORD-20260131-0001	07837733549	rajat Gupta	430.00	0.00	430.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 09:56:12.195966+00	2026-04-04 14:41:56.256117+00	d907c673-e5e0-493c-b33d-703965de87a3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
6dc8a776-b151-4053-b710-cb5e7729dfd3	ORD-20260203-0001	\N	\N	180.00	0.00	180.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:04:38.309309+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
3aba4f3b-b2fa-43ed-9e0f-1a52f52d9d6c	ORD-20260203-0002	\N	\N	350.00	0.00	350.00	UPI	PENDING	300	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:05:39.365103+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
012e9b8a-5a47-4bd4-8a49-df8a146c5d5c	ORD-20260203-0003	\N	\N	100.00	0.00	100.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:06:31.268189+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
d4c5124b-6ed4-46ea-980c-d480d3ba35eb	ORD-20260203-0004	\N	\N	100.00	0.00	100.00	UPI	PENDING	75	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:07:19.34247+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
85d869a5-b261-46a4-bbaa-d659a1537522	ORD-20260203-0005	\N	\N	240.00	0.00	240.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:08:05.709147+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
6b6041a8-e18e-43e4-b8d2-61cd1a24e210	ORD-20260203-0006	\N	\N	100.00	0.00	100.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:09:40.856911+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
898144f1-d22b-4e52-b16a-46e5a2bb5456	ORD-20260203-0007	\N	\N	150.00	0.00	150.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:09:57.098591+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
df8db34e-6a9e-4e45-948e-1df1298a4c52	ORD-20260203-0008	\N	\N	580.00	0.00	580.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:10:44.120831+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
ded49685-6dfd-40d7-9d08-fed13f77169e	ORD-20260203-0009	\N	\N	170.00	0.00	170.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:11:13.227014+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
6dc00138-9273-4081-9c84-cab7fe1f2fae	ORD-20260203-0010	\N	\N	150.00	0.00	150.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:11:38.105215+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
8517cb95-2584-4794-ace5-dc6ff0a26442	ORD-20260203-0011	\N	\N	270.00	0.00	270.00	CASH	PENDING	200	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:13:16.182147+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
04558fc6-575b-42f0-86ba-5f9e34d345d3	ORD-20260203-0012	\N	\N	150.00	0.00	150.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:13:34.927126+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
e67f8624-b67e-4e69-8c6d-5a8979096e75	ORD-20260203-0013	\N	\N	300.00	0.00	300.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:14:01.714305+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
83947941-b749-4896-957e-2a682b523ea4	ORD-20260203-0014	\N	\N	240.00	0.00	240.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:15:04.123764+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a6a6e407-38d9-42b8-ad64-2f97994d7bf5	ORD-20260203-0015	\N	\N	120.00	0.00	120.00	UPI	PENDING	170	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:16:22.718057+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
5b5a251e-e608-43bf-a9be-da535ac77097	ORD-20260203-0016	\N	\N	250.00	0.00	250.00	UPI	PENDING	300	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:17:01.611941+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
e29c5dcc-8f7b-4d8d-bb35-35a438b6b27e	ORD-20260203-0017	\N	\N	240.00	0.00	240.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:17:53.07216+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
416d322e-3bc2-4b23-8bb0-56410a1a39c2	ORD-20260203-0018	\N	\N	170.00	0.00	170.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:18:06.617322+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
ffb366c5-b72a-4b63-b830-0e41b064f442	ORD-20260203-0019	\N	\N	180.00	0.00	180.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:18:28.287155+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
c8d06d15-5e32-4339-8f52-1fe36503203e	ORD-20260203-0020	\N	\N	100.00	0.00	100.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:19:07.510233+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
2b24dbb6-c319-4e55-aeb3-38d456e9fa3f	ORD-20260203-0021	\N	\N	210.00	0.00	210.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:19:42.138179+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a8644ac1-e0cf-464d-928f-0204f3699380	ORD-20260203-0022	\N	\N	150.00	0.00	150.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:20:08.035341+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
93740e89-1ca3-43de-aba9-e1f26f366c78	ORD-20260203-0023	\N	\N	150.00	0.00	150.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:20:29.97293+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
0076d71c-923c-4ef1-956c-f896d6f0cac1	ORD-20260203-0024	\N	\N	100.00	0.00	100.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:20:43.757982+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
2ce06549-d28a-4b56-9431-39bb102f5725	ORD-20260203-0025	\N	\N	280.00	0.00	280.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:37:06.160257+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
cac1e02a-aee1-42b8-9a5f-647ab90ead1f	ORD-20260203-0026	\N	\N	800.00	0.00	800.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 14:40:49.0822+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
357b03fd-1b3a-4570-98ec-f5ffc98a0562	ORD-20260203-0027	\N	\N	170.00	0.00	170.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 15:02:13.491662+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
06e969de-f502-4047-91a4-8a802fdc0e7b	ORD-20260203-0028	\N	\N	200.00	0.00	200.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 15:15:56.211485+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
ba0d4df4-a092-4512-a88e-8b648503b052	ORD-20260203-0029	\N	\N	100.00	0.00	100.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 15:16:55.988006+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
75882362-337b-4ff6-8c88-45ee576d876e	ORD-20260203-0030	\N	\N	110.00	0.00	110.00	UPI	PENDING	130	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 15:36:49.601379+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
34e966e3-840e-4903-8d71-d9eedd2eee69	ORD-20260203-0031	\N	\N	20.00	0.00	20.00	CASH	PENDING	90	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-03 15:37:47.807989+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
7303a07d-a7d1-41ee-9aa3-53ba013e1518	ORD-20260204-0001	07837733549	rajat Gupta	280.00	0.00	280.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-02-04 06:21:30.1597+00	2026-04-04 14:41:56.256117+00	d907c673-e5e0-493c-b33d-703965de87a3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
900658de-03fa-47ec-8ab1-745ba4006ddf	ORD-20260318-0001	\N	\N	150.00	0.00	150.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-18 11:33:53.864426+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
c3e2c9bd-01e4-46f3-bc0d-7f1178359dab	ORD-20260406-0003	8882626545	ryan	240.00	0.00	240.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-06 15:43:52.624012+00	2026-04-06 15:43:52.624012+00	e7d0ef97-921c-4207-97ce-117fd680dcab	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	144
f70b297f-4dbd-47f5-a7b1-a2b8626621a1	ORD-20260408-0002	8882626545	ryan	480.00	0.00	480.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-08 13:42:17.946377+00	2026-04-08 13:42:17.946377+00	e7d0ef97-921c-4207-97ce-117fd680dcab	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
59225ae3-2425-4089-a25f-50d9ccc9c855	ORD-20260318-0002	\N	\N	420.00	0.00	420.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-18 11:58:30.125907+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
c1bc14f6-4837-4ec0-bad6-3f353b5e571c	ORD-20260318-0003	\N	\N	150.00	0.00	150.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-18 12:09:31.481157+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
3bf86238-85dd-4c53-bd06-56e29632ec7f	ORD-20260318-0004	\N	\N	250.00	0.00	250.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-18 12:53:25.114923+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
8680c818-e6ee-4b62-a31c-5427f9a37d5d	ORD-20260320-0001	\N	\N	400.00	0.00	400.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-20 06:13:36.951696+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
2716b43f-2faf-4ce5-952b-af03c04b5b0d	ORD-20260320-0002	\N	\N	300.00	0.00	300.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-20 07:10:13.828487+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
505b4403-92ad-4491-802a-6bf935682f45	ORD-20260322-0001	9876543210	Test Customer	260.00	0.00	260.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-22 04:44:22.404194+00	2026-04-04 14:41:56.256117+00	bdd9e4b9-0f6b-4b08-9bc3-d08476741a34	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a27d37d1-f82c-4d8c-8322-518a1c46fa0d	ORD-20260322-0002	1110000003	Concurrent 3	130.00	0.00	130.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-22 04:44:49.211471+00	2026-04-04 14:41:56.256117+00	5abbc086-3cef-441e-9737-8296223ba6ba	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
ff28bf75-337e-4930-b457-e2d0eab57ece	ORD-20260322-0003	1110000002	Concurrent 2	130.00	0.00	130.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-22 04:44:49.212832+00	2026-04-04 14:41:56.256117+00	696327c6-aa78-4964-8279-14bc4cf749fd	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
c7c06c18-5f03-4783-b878-d116deb207ba	ORD-20260322-0004	1110000004	Concurrent 4	130.00	0.00	130.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-22 04:44:50.570585+00	2026-04-04 14:41:56.256117+00	0d2cbb2a-136b-440c-a15b-5e530da76170	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
14440137-ef6f-40ad-a214-b48c072faf47	ORD-20260322-0005	1110000001	Concurrent 1	130.00	0.00	130.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-22 04:44:50.624071+00	2026-04-04 14:41:56.256117+00	2e30c0c3-5c65-435a-aca6-76f861bdbbf7	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
b1717c91-6237-4c02-ac58-f993ec26b7f7	ORD-20260322-0006	1110000005	Concurrent 5	130.00	0.00	130.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-22 04:44:50.665517+00	2026-04-04 14:41:56.256117+00	573ec462-8ead-466f-a399-178b2dae1f51	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
b25993bf-eaea-477a-9e3b-b04892cfbd71	ORD-20260322-0007	9999888777	Duplicate Test	130.00	0.00	130.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-22 04:45:10.731811+00	2026-04-04 14:41:56.256117+00	9ee020d3-7439-4061-a731-412165cc473e	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
741433f9-c5e5-4c2e-baa7-683c48d8bac3	ORD-20260322-0008	9999888777	Duplicate Test	130.00	0.00	130.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-22 04:45:11.001092+00	2026-04-04 14:41:56.256117+00	9ee020d3-7439-4061-a731-412165cc473e	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
c7e223ea-5b8f-489a-a09a-dad3f280e522	ORD-20260322-0009	8888777666	Variant Test	180.00	0.00	180.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-22 04:46:40.209244+00	2026-04-04 14:41:56.256117+00	c3e7604c-b46f-45b6-993d-896b3794941d	\N	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
e432e22c-1f64-404d-b71c-f60d84415cac	ORD-20260330-0001	8557984227	Rupinder	120.00	0.00	120.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-30 14:09:58.424639+00	2026-04-04 14:41:56.256117+00	cdcfa4a4-35fe-40d5-b6c4-38135c21e6d0	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
3bae1580-738e-4f09-ae95-a76cc8092719	ORD-20260330-0002	9888814129	Ratan	130.00	0.00	130.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-30 14:32:22.590393+00	2026-04-04 14:41:56.256117+00	be8379f8-d677-4f14-9cb6-b6995fad28a7	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
49b897c0-9705-4ff9-b4a7-20e401bff9b6	ORD-20260330-0003	9888480868	Kulwinder	300.00	0.00	300.00	CASH	PENDING	Meal 15Th	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-30 14:38:21.702282+00	2026-04-04 14:41:56.256117+00	102fdec4-5106-4eaa-86fa-7c6efc2d74ee	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
639e61ff-f700-4c90-9e2d-a21c8574172f	ORD-20260330-0004	6385851238	Dr adithyan	170.00	0.00	170.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-30 14:47:38.927291+00	2026-04-04 14:41:56.256117+00	7655676e-aae0-49e2-a44f-36ea3b324331	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
b3809702-8afe-4106-ac70-985cc526e013	ORD-20260330-0005	7986697675	Aman	140.00	0.00	140.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-30 14:58:35.486001+00	2026-04-04 14:41:56.256117+00	3612f657-bb44-4a7f-b0c8-f652a91940dd	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
834138cf-c314-4dbb-9956-d6eb4960d1a2	ORD-20260330-0006	7889088227	Dara	300.00	0.00	300.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-30 15:17:25.1403+00	2026-04-04 14:41:56.256117+00	1d5a6746-dd5a-4e6c-811c-3b744174b7df	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
04894e98-8b4e-4a19-9347-07bb1b552cef	ORD-20260330-0007	7018912044	Indin	160.00	0.00	160.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-30 15:35:25.276709+00	2026-04-04 14:41:56.256117+00	713816c1-45b6-418a-9d30-964d86e575fd	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
79747488-a713-4a2b-bb61-aab2f96c109a	ORD-20260330-0008	9779200053	Sukhjot	650.00	0.00	650.00	CASH	PENDING	Meal	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-30 16:00:37.759014+00	2026-04-04 14:41:56.256117+00	6e4e2898-687d-45cb-b086-184af3570c77	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
5f4137e7-2348-4ed1-8883-8f76ae555f64	ORD-20260331-0001	9888833326	Emmie	280.00	0.00	280.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-03-31 16:04:03.208612+00	2026-04-04 14:41:56.256117+00	c0ae7190-1af5-47d3-975c-81d81b86eeb9	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
52b3d679-9241-49d0-a5a0-782b7d58a6f9	ORD-20260401-0001	8968700270	New	340.00	0.00	340.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 09:52:12.399081+00	2026-04-04 14:41:56.256117+00	83e41340-a26c-41df-a623-5f8a007c002c	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
8250f1a3-21b4-41bb-9943-b38b4177ab19	ORD-20260401-0002	9872266265	sehaj	300.00	0.00	300.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 11:32:38.677807+00	2026-04-04 14:41:56.256117+00	b7128d70-9ad1-41da-8541-5607c2d1913d	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
2c49fa61-eb1c-4a48-bf82-e6d978a2af6e	ORD-20260401-0003	9781857530	Aman	210.00	0.00	210.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 11:58:39.504053+00	2026-04-04 14:41:56.256117+00	9cf7c204-4818-4adb-a85f-8ecb29cf68fd	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
5855dd37-8d72-4fbc-af42-ae4173370647	ORD-20260401-0004	8727966718	Birinder	100.00	0.00	100.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 12:01:25.532164+00	2026-04-04 14:41:56.256117+00	b3b8d429-ab15-4ba0-ad68-513436d7eba8	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
4bced266-e7d9-4e0d-b836-8d40c1be7ba2	ORD-20260401-0005	9316488821	Archi	5250.00	0.00	5250.00	CARD	PENDING	32 meal package	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 13:23:34.943679+00	2026-04-04 14:41:56.256117+00	ae9e20a7-33b7-432e-9a85-e3dff5a02b83	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
38232373-65a5-42bb-b51b-98c746cbb73b	ORD-20260401-0006	8882626545	ryan	480.00	0.00	480.00	CARD	PENDING	steamed 300g	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 13:49:06.103586+00	2026-04-04 14:41:56.256117+00	e7d0ef97-921c-4207-97ce-117fd680dcab	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
0e15fe9a-54e0-4039-9428-922e8b4f3001	ORD-20260401-0007	7986546791	PUNEET	210.00	0.00	210.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 14:05:02.663521+00	2026-04-04 14:41:56.256117+00	091141fc-70d8-45b0-bfc0-942749e58e4d	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
13cc6d81-de58-4ae2-b687-6de663ff378a	ORD-20260401-0008	8725033137	Anshul	300.00	0.00	300.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 14:49:46.48163+00	2026-04-04 14:41:56.256117+00	c50064b1-e6b3-4ade-ba2a-725c00c2c1af	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a05560ee-4c3a-47dc-b18e-5451f2ad0722	ORD-20260401-0009	8284804416	m. dogra	150.00	0.00	150.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 14:50:22.381775+00	2026-04-04 14:41:56.256117+00	0657b88a-b69b-469d-8afd-22555e28baa1	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a77fdee5-96a6-45db-b130-3d6b2b428d13	ORD-20260401-0010	7889088227	Dara	300.00	0.00	300.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 15:21:21.79202+00	2026-04-04 14:41:56.256117+00	1d5a6746-dd5a-4e6c-811c-3b744174b7df	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
925993a6-20a9-4593-ab21-3d3ee527b596	ORD-20260401-0011	7889088227	Dara	300.00	0.00	300.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 15:21:33.185654+00	2026-04-04 14:41:56.256117+00	1d5a6746-dd5a-4e6c-811c-3b744174b7df	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
84240672-49c9-4d3d-9cfd-abe10d8dcf23	ORD-20260408-0003	8558885691	Pardeep	150.00	0.00	150.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-08 13:47:22.474767+00	2026-04-08 13:47:22.474767+00	86c8de37-9ab3-41de-a17c-69fb640b57cd	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
912cec58-ea2c-4833-a82a-48fb3e0281d2	ORD-20260410-0004	8219444491	Saurav	310.00	0.00	310.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-10 13:21:58.717653+00	2026-04-10 13:21:58.717653+00	9344135d-27f1-4a2c-aed2-9fc76752fc15	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
cb290522-49d9-487f-869a-604d24e0bfb8	ORD-20260415-0001	9815687899	Deepak	560.00	0.00	560.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-15 14:03:24.965541+00	2026-04-15 14:03:24.965541+00	fb60b19d-a30a-4078-a75c-a01897e75787	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
dbe57516-4206-44f9-a795-151a30b4118e	ORD-20260415-0002	7814346557	Ashneet	270.00	0.00	270.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-15 14:05:16.740152+00	2026-04-15 14:05:16.740152+00	0503a047-2d37-40e2-954f-fdbfff8f0671	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
c8454b9c-de39-4ba4-8b97-e08ba0794c11	ORD-20260416-0005	9501758111	Malkiat Singh	5250.00	0.00	5250.00	CASH	PENDING	\N	217c7097-1140-4918-a56d-e6d913722541	2026-04-16 10:51:56.249476+00	2026-04-16 10:51:56.249476+00	978802cd-4694-4395-9df9-c842a4c2d253	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
4f186972-5762-4278-9bda-c91040959f69	ORD-20260401-0012	9781989994	Karan	170.00	0.00	170.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 15:25:36.577811+00	2026-04-04 14:41:56.256117+00	ff4393c2-0899-4764-8002-29386b6d3af3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a1c015c1-9a13-4039-8279-f9bfb195f51e	ORD-20260401-0013	8872222286	JASPREET	210.00	0.00	210.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 15:30:20.562387+00	2026-04-04 14:41:56.256117+00	2bd07fec-2c5e-4687-a291-1116113eaa4a	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
9041c8e3-a16a-4645-8e1f-4fafa424aed4	ORD-20260401-0014	7888835259	Akashdeep	300.00	0.00	300.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-01 15:59:42.718408+00	2026-04-04 14:41:56.256117+00	ae16e44c-5162-429e-bb76-ac4f6f40fda9	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
3b0872d0-d7b8-481f-8ed2-af5122f8f01c	ORD-20260402-0001	8882626545	ryan	240.00	0.00	240.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 11:25:44.748251+00	2026-04-04 14:41:56.256117+00	e7d0ef97-921c-4207-97ce-117fd680dcab	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
ed0bffdf-9f89-4130-b01e-58bfd13e0c31	ORD-20260402-0002	8727966718	Birinder	100.00	0.00	100.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 11:27:20.756732+00	2026-04-04 14:41:56.256117+00	b3b8d429-ab15-4ba0-ad68-513436d7eba8	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
83b98592-8abc-4892-ad6c-4ffe6578c4ee	ORD-20260402-0003	9781857530	Aman	240.00	0.00	240.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 11:32:43.226341+00	2026-04-04 14:41:56.256117+00	9cf7c204-4818-4adb-a85f-8ecb29cf68fd	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
0d93aff5-3765-4ffd-b54f-7fb14515483f	ORD-20260402-0004	8899048219	Ubaid khan	280.00	0.00	280.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 12:32:18.567222+00	2026-04-04 14:41:56.256117+00	5cb6881e-f6a5-4486-b425-66232040847a	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
5d05c323-9c60-4215-8419-cbf1dbb5f70d	ORD-20260402-0005	9988161089	Jaspreet	150.00	0.00	150.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 12:43:31.336816+00	2026-04-04 14:41:56.256117+00	fbf144af-3b63-42bf-a5bd-b6768ac67c03	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
2fbe296c-4b86-4eb0-9f5a-a2457e947c21	ORD-20260402-0006	8427346684	Gurpreet	360.00	0.00	360.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 14:10:04.156254+00	2026-04-04 14:41:56.256117+00	6d0572e1-3e78-4c19-acc0-3909df255fe0	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
4a55c61a-1344-48be-9ea0-99b4a370aa0d	ORD-20260402-0007	\N	\N	100.00	0.00	100.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 14:12:15.611708+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
6a6355ee-7d57-4d17-973e-28b678cd41d1	ORD-20260402-0009	\N	\N	8250.00	0.00	8250.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 14:19:01.400475+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 14:19:30.71342	WRong order	\N	\N	\N	0	f	0
9ab49967-722a-4b57-bd10-73d91be82841	ORD-20260402-0010	\N	\N	3000.00	0.00	3000.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 14:20:12.011376+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
302f8c46-33ca-4255-aa06-8fd3210f23c3	ORD-20260402-0011	8284804416	m. dogra	180.00	0.00	180.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 14:51:34.431606+00	2026-04-04 14:41:56.256117+00	0657b88a-b69b-469d-8afd-22555e28baa1	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a8804faa-24eb-44df-bdd4-35f7f093105c	ORD-20260402-0012	9815994592	Ekam	170.00	0.00	170.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 15:13:50.008799+00	2026-04-04 14:41:56.256117+00	c62bc63d-6194-494f-915a-c95d3c127abb	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a5b373f7-0a55-4696-a997-b846a6b0a80b	ORD-20260402-0013	8569021786	Pritpal singh	160.00	0.00	160.00	CARD	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 15:17:12.902533+00	2026-04-04 14:41:56.256117+00	da95a893-3efb-4beb-8a75-8d123db3482d	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
d602e00b-88af-44b6-903f-4f730b58ba3c	ORD-20260402-0014	7889088227	Dara	300.00	0.00	300.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 15:26:32.897545+00	2026-04-04 14:41:56.256117+00	1d5a6746-dd5a-4e6c-811c-3b744174b7df	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
a3d0ade0-4593-49ab-8bc2-bbd04bb5de5c	ORD-20260403-0001	8882626545	ryan	240.00	0.00	240.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 12:17:44.407706+00	2026-04-04 14:41:56.256117+00	e7d0ef97-921c-4207-97ce-117fd680dcab	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
dd776b42-75e2-4445-a889-ea9bbe42aa5b	ORD-20260403-0002	9781857530	Aman	210.00	0.00	210.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 12:51:50.248567+00	2026-04-04 14:41:56.256117+00	9cf7c204-4818-4adb-a85f-8ecb29cf68fd	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
046dfb35-3381-45ef-98c1-a07286b8ac71	ORD-20260403-0003	7009562760	Mandeep	440.00	0.00	440.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 13:27:36.234546+00	2026-04-04 14:41:56.256117+00	85dade61-6ba2-4ef9-89a9-f2b64781b9ce	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
683082a2-5961-456c-b433-5024a4b067ec	ORD-20260403-0004	9812550900	Sameer	180.00	0.00	180.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 14:31:14.167118+00	2026-04-04 14:41:56.256117+00	0fac967c-7783-44ac-8ca7-99d43bf04679	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
0d68a76b-ba86-42a1-a86e-542689fc1c49	ORD-20260403-0005	8284804416	m. dogra	180.00	0.00	180.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 14:31:33.979556+00	2026-04-04 14:41:56.256117+00	0657b88a-b69b-469d-8afd-22555e28baa1	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
3694acf1-3a15-44b9-be57-6f83c0d01db1	ORD-20260403-0006	8054638082	Anmol	170.00	0.00	170.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 14:48:37.476442+00	2026-04-04 14:41:56.256117+00	cbe583f3-84c0-4db1-82ad-a1a019150ee2	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
cdafbd1e-3e19-4daa-b552-e9de6ad603e1	ORD-20260403-0007	8054638082	Anmol	150.00	0.00	150.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 14:55:19.181609+00	2026-04-04 14:41:56.256117+00	cbe583f3-84c0-4db1-82ad-a1a019150ee2	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
c4db938d-ed3c-4195-badb-3292394b3195	ORD-20260403-0008	9988161089	Jaspreet	170.00	0.00	170.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 14:56:07.987843+00	2026-04-04 14:41:56.256117+00	fbf144af-3b63-42bf-a5bd-b6768ac67c03	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
833b27e6-8a48-4e20-9d72-96954f6c1bb8	ORD-20260403-0009	7696343400	Ajay Maan	130.00	0.00	130.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 15:50:07.122534+00	2026-04-04 14:41:56.256117+00	eb1f578e-f0cc-48b1-9bad-d934198090f3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
966af58d-bcb8-4316-a52a-930cc9dc8265	ORD-20260403-0010	8708002661	Shebaz	320.00	0.00	320.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 15:59:08.585119+00	2026-04-04 14:41:56.256117+00	0db2e21c-c13d-4cd6-aaaa-a5b6adb1afb3	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
f9719581-dbff-4864-9b21-9ae30b4806a0	ORD-20260403-0011	7889088227	Dara	200.00	0.00	200.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 15:59:54.064112+00	2026-04-04 14:41:56.256117+00	1d5a6746-dd5a-4e6c-811c-3b744174b7df	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
11f641a5-8b84-4ce8-bbda-610f46142d26	ORD-20260403-0012	8837679312	Varun	250.00	0.00	250.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 16:24:02.409475+00	2026-04-04 14:41:56.256117+00	133a36f8-bb1f-48b5-b840-eca8e0d8203c	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
2f4666a4-e42e-4448-826e-9e9377b4215b	ORD-20260403-0013	\N	\N	160.00	0.00	160.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 16:24:27.683935+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
d2470726-537b-4201-aee5-dcb209f34122	ORD-20260403-0014	\N	\N	120.00	0.00	120.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-03 16:24:56.708102+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
dd1b98cb-218b-4d77-9ebe-27d773a0f795	ORD-20260404-0001	8054270064	Saurav	230.00	0.00	230.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-04 14:12:48.317376+00	2026-04-04 14:41:56.256117+00	4b4a2952-1b1f-4a2c-b66e-336df0686a55	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
680ff6b7-8050-4f8d-b77f-272a51fdec89	ORD-20260402-0008	9316488821	Archi	3.00	0.00	3.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-02 14:16:21.575516+00	2026-04-04 14:45:16.774549+00	ae9e20a7-33b7-432e-9a85-e3dff5a02b83	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
592a7455-6591-4379-8f2f-cc5d61dbae9a	ORD-20260408-0004	8872600268	Arsh	710.00	0.00	710.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-08 14:19:30.558201+00	2026-04-08 14:19:30.558201+00	350ab1a1-4404-4873-bac1-c8deb601c835	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
d81e75a6-d8ac-4941-a402-41946eeca960	ORD-20260410-0005	9812550900	Sameer	180.00	0.00	180.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-10 13:24:26.95643+00	2026-04-10 13:24:26.95643+00	0fac967c-7783-44ac-8ca7-99d43bf04679	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
490902f5-449e-4158-8533-e8dd5a2f1c19	ORD-20260415-0003	8284804416	m. dogra	210.00	0.00	210.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-15 14:40:42.303621+00	2026-04-15 14:40:42.303621+00	0657b88a-b69b-469d-8afd-22555e28baa1	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
d3555aed-65f7-44c2-a980-98c736a97d20	ORD-20260416-0006	9988192271	Karan	180.00	0.00	180.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-16 13:51:02.454289+00	2026-04-16 13:51:02.454289+00	7ce97f05-5771-41f0-820c-15b121776798	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
8bf4561d-2dcc-4577-a247-d77bcb7a8445	ORD-20260404-0002	\N	\N	640.00	0.00	640.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-04 14:15:48.175126+00	2026-04-04 14:41:56.256117+00	\N	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
98b7e658-1762-4cba-8dc1-018031996e79	ORD-20260408-0005	8284804416	m. dogra	200.00	0.00	200.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-08 14:46:56.943217+00	2026-04-08 14:46:56.943217+00	0657b88a-b69b-469d-8afd-22555e28baa1	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
ca3f75e1-765f-4fc9-9d2f-d6a8fe95285d	ORD-20260410-0006	9872076307	Manraz	160.00	0.00	160.00	UPI	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-10 13:39:25.713059+00	2026-04-10 13:39:25.713059+00	74dd7cc9-3b0a-426e-887f-1edf281f209d	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
efc475c6-522d-4fd5-8c00-c8762e0e345e	ORD-20260410-0007	6280565949	Garry	170.00	0.00	170.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-10 13:44:33.012656+00	2026-04-10 13:44:33.012656+00	e0e36b55-6212-4b64-a5e9-495dfca391b0	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
6e6830b6-932d-4bec-9fe6-38c62a8ea7e4	ORD-20260416-0001	8360659942	Vaibhav	300.00	0.00	300.00	CASH	PENDING	\N	217c7097-1140-4918-a56d-e6d913722541	2026-04-16 10:37:20.79171+00	2026-04-16 10:37:20.79171+00	d9f13bd9-5ed9-4656-8c37-887b518e6f48	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
54f2cb3e-a2ce-44ff-8d0f-a1e4298dc4cf	ORD-20260420-0001	9872892308	Divjot	180.00	0.00	180.00	CASH	PENDING	\N	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-04-20 13:19:56.416644+00	2026-04-20 13:19:56.416644+00	d964c2fc-ef8e-4de0-8a91-47e1bf3e3618	c61a3558-f8dd-40d3-902c-9a0a6c234997	CONFIRMED	\N	\N	\N	\N	\N	\N	0	f	0
\.


--
-- Data for Name: package_activity_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.package_activity_log (id, entity_type, entity_id, action, performed_by, performed_at, changes, metadata, customer_id, package_id, ip_address, user_agent) FROM stdin;
64d06f3a-64fa-47e2-9a67-01a5ec64250f	package	972d8e18-a4dd-45cf-b6a9-52ef4d1564a8	package_created	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:02:39.858541+00	{"after": {"id": "972d8e18-a4dd-45cf-b6a9-52ef4d1564a8", "name": "30 Meals Package", "price": "2999.99", "is_active": true, "created_at": "2026-01-31T13:02:39.583Z", "created_by": "d901cbdb-101b-49e3-a421-4d01a572b77a", "meal_count": 30, "updated_at": "2026-01-31T13:02:39.583Z", "description": "Basic meal package with 30 meals", "validity_days": 30}, "before": null}	{"name": "30 Meals Package", "price": 2999.99, "mealCount": 30}	\N	972d8e18-a4dd-45cf-b6a9-52ef4d1564a8	\N	\N
7fd8eec5-700b-468d-8504-a4baf235c47c	package	637ea375-e523-47da-9037-badcead90226	package_created	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:02:56.250752+00	{"after": {"id": "637ea375-e523-47da-9037-badcead90226", "name": "60 Meals Package", "price": "5499.99", "is_active": true, "created_at": "2026-01-31T13:02:55.809Z", "created_by": "d901cbdb-101b-49e3-a421-4d01a572b77a", "meal_count": 60, "updated_at": "2026-01-31T13:02:55.809Z", "description": "Standard meal package with 60 meals", "validity_days": 60}, "before": null}	{"name": "60 Meals Package", "price": 5499.99, "mealCount": 60}	\N	637ea375-e523-47da-9037-badcead90226	\N	\N
7a4c215a-d8b6-4164-9d14-6551f812b78d	package	391e49b9-1f76-4e63-a4fe-3ba7bdb9d925	package_created	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:02:57.17211+00	{"after": {"id": "391e49b9-1f76-4e63-a4fe-3ba7bdb9d925", "name": "90 Meals Package", "price": "7999.99", "is_active": true, "created_at": "2026-01-31T13:02:56.870Z", "created_by": "d901cbdb-101b-49e3-a421-4d01a572b77a", "meal_count": 90, "updated_at": "2026-01-31T13:02:56.870Z", "description": "Premium meal package with 90 meals", "validity_days": 90}, "before": null}	{"name": "90 Meals Package", "price": 7999.99, "mealCount": 90}	\N	391e49b9-1f76-4e63-a4fe-3ba7bdb9d925	\N	\N
97fb541e-7eb9-414d-a058-e86fd64e4b23	assignment	75f3eeeb-ac02-4230-8fc1-d5fdac02ed76	package_assigned	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:04:41.914502+00	{"after": {"id": "75f3eeeb-ac02-4230-8fc1-d5fdac02ed76", "notes": "Onboarded existing offline customer. 10 meals already consumed.", "status": "active", "starts_at": "2026-01-14T18:30:00.000Z", "created_at": "2026-01-31T13:04:41.658Z", "expires_at": "2026-02-14T18:30:00.000Z", "package_id": "972d8e18-a4dd-45cf-b6a9-52ef4d1564a8", "updated_at": "2026-01-31T13:04:41.658Z", "amount_paid": "2000.00", "assigned_at": "2026-01-31T13:04:41.658Z", "assigned_by": "d901cbdb-101b-49e3-a421-4d01a572b77a", "customer_id": "a5fee63d-540c-45a6-a2b5-888948a3ccda", "total_meals": 30, "cancelled_at": null, "completed_at": null, "package_price": "2999.99", "consumed_meals": 0, "payment_status": "partial", "remaining_meals": 30, "cancellation_reason": null}, "before": null}	{"totalMeals": 30, "packageName": "30 Meals Package", "customerName": "test null", "packagePrice": "2999.99"}	a5fee63d-540c-45a6-a2b5-888948a3ccda	972d8e18-a4dd-45cf-b6a9-52ef4d1564a8	\N	\N
8ef317d6-b15b-4f6b-8fd5-602fb86d1fff	assignment	75f3eeeb-ac02-4230-8fc1-d5fdac02ed76	assignment_updated	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:04:54.78775+00	{"after": {"id": "75f3eeeb-ac02-4230-8fc1-d5fdac02ed76", "notes": "Onboarded existing offline customer. 10 meals already consumed (updated manually).", "status": "active", "starts_at": "2026-01-14T18:30:00.000Z", "created_at": "2026-01-31T13:04:41.658Z", "expires_at": "2026-02-14T18:30:00.000Z", "package_id": "972d8e18-a4dd-45cf-b6a9-52ef4d1564a8", "updated_at": "2026-01-31T13:04:54.526Z", "amount_paid": "2000.00", "assigned_at": "2026-01-31T13:04:41.658Z", "assigned_by": "d901cbdb-101b-49e3-a421-4d01a572b77a", "customer_id": "a5fee63d-540c-45a6-a2b5-888948a3ccda", "total_meals": 30, "cancelled_at": null, "completed_at": null, "package_price": "2999.99", "consumed_meals": 0, "payment_status": "partial", "remaining_meals": 30, "cancellation_reason": null}, "before": {"id": "75f3eeeb-ac02-4230-8fc1-d5fdac02ed76", "notes": "Onboarded existing offline customer. 10 meals already consumed.", "status": "active", "starts_at": "2026-01-14T18:30:00.000Z", "created_at": "2026-01-31T13:04:41.658Z", "expires_at": "2026-02-14T18:30:00.000Z", "package_id": "972d8e18-a4dd-45cf-b6a9-52ef4d1564a8", "updated_at": "2026-01-31T13:04:41.658Z", "amount_paid": "2000.00", "assigned_at": "2026-01-31T13:04:41.658Z", "assigned_by": "d901cbdb-101b-49e3-a421-4d01a572b77a", "customer_id": "a5fee63d-540c-45a6-a2b5-888948a3ccda", "total_meals": 30, "cancelled_at": null, "completed_at": null, "package_name": "30 Meals Package", "customer_name": null, "package_price": "2999.99", "consumed_meals": 0, "customer_phone": "24312412341234", "payment_status": "partial", "remaining_meals": 30, "assigned_by_name": "Robuster's Admin", "cancellation_reason": null, "package_description": "Basic meal package with 30 meals"}}	\N	a5fee63d-540c-45a6-a2b5-888948a3ccda	972d8e18-a4dd-45cf-b6a9-52ef4d1564a8	\N	\N
8570e95d-21b5-43d4-8de1-46102afc9daa	assignment	e0df62af-b012-4d2a-bc27-d836bf1648a4	package_assigned	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:06:13.168819+00	{"after": {"id": "e0df62af-b012-4d2a-bc27-d836bf1648a4", "notes": "Migrated from offline system. Customer had 60 meals, consumed 15, remaining 45.", "status": "active", "starts_at": "2025-12-31T18:30:00.000Z", "created_at": "2026-01-31T13:06:12.819Z", "expires_at": "2026-02-28T18:30:00.000Z", "package_id": "637ea375-e523-47da-9037-badcead90226", "updated_at": "2026-01-31T13:06:12.819Z", "amount_paid": "5499.99", "assigned_at": "2026-01-31T13:06:12.819Z", "assigned_by": "d901cbdb-101b-49e3-a421-4d01a572b77a", "customer_id": "a5fee63d-540c-45a6-a2b5-888948a3ccda", "total_meals": 60, "cancelled_at": null, "completed_at": null, "package_price": "5499.99", "consumed_meals": 15, "payment_status": "paid", "remaining_meals": 45, "cancellation_reason": null}, "before": null}	{"totalMeals": 60, "packageName": "60 Meals Package", "customerName": "test null", "packagePrice": "5499.99"}	a5fee63d-540c-45a6-a2b5-888948a3ccda	637ea375-e523-47da-9037-badcead90226	\N	\N
b6cfbd58-1701-4334-b295-124448ac6a91	package	972d8e18-a4dd-45cf-b6a9-52ef4d1564a8	allowed_item_added	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:07:06.519267+00	\N	{"categoryId": "889427de-fb27-4ec3-b9f0-004816c8bc24", "allowedItemId": "942b30d7-7088-4408-8c92-c1b0104b7c69"}	\N	972d8e18-a4dd-45cf-b6a9-52ef4d1564a8	\N	\N
1922f958-f97a-4498-a69b-054b1948d0d4	assignment	3e666d06-d0da-4266-8310-04ff543585be	package_assigned	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:31:43.660671+00	{"after": {"id": "3e666d06-d0da-4266-8310-04ff543585be", "notes": null, "status": "active", "starts_at": "2026-01-30T18:30:00.000Z", "created_at": "2026-01-31T13:31:43.328Z", "expires_at": "2026-03-30T18:30:00.000Z", "package_id": "637ea375-e523-47da-9037-badcead90226", "updated_at": "2026-01-31T13:31:43.328Z", "amount_paid": "5499.99", "assigned_at": "2026-01-31T13:31:43.328Z", "assigned_by": "d901cbdb-101b-49e3-a421-4d01a572b77a", "customer_id": "bdd9e4b9-0f6b-4b08-9bc3-d08476741a34", "total_meals": 60, "cancelled_at": null, "completed_at": null, "package_price": "5499.99", "consumed_meals": 0, "payment_status": "paid", "remaining_meals": 60, "cancellation_reason": null}, "before": null}	{"totalMeals": 60, "packageName": "60 Meals Package", "customerName": "John Doe", "packagePrice": "5499.99"}	bdd9e4b9-0f6b-4b08-9bc3-d08476741a34	637ea375-e523-47da-9037-badcead90226	\N	\N
d8c3dd5e-ff57-4fbf-96b4-c1e4d29fd2d9	package	637ea375-e523-47da-9037-badcead90226	allowed_item_added	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 13:32:32.263098+00	\N	{"categoryId": "889427de-fb27-4ec3-b9f0-004816c8bc24", "allowedItemId": "b688af79-0b2f-4862-bd2e-da962293eb7f"}	\N	637ea375-e523-47da-9037-badcead90226	\N	\N
5be7424a-eb42-4c13-a7b0-4caedae58523	package	71c06eb5-d691-416a-9d5a-c4f059ba44c0	package_created	d901cbdb-101b-49e3-a421-4d01a572b77a	2026-01-31 14:05:35.989538+00	{"after": {"id": "71c06eb5-d691-416a-9d5a-c4f059ba44c0", "name": "30 Meal Package", "price": "3000.00", "is_active": true, "created_at": "2026-01-31T14:05:35.684Z", "created_by": "d901cbdb-101b-49e3-a421-4d01a572b77a", "meal_count": 30, "updated_at": "2026-01-31T14:05:35.684Z", "description": "30 meals with 30 days validity", "validity_days": 30}, "before": null}	{"name": "30 Meal Package", "price": 3000, "mealCount": 30}	\N	71c06eb5-d691-416a-9d5a-c4f059ba44c0	\N	\N
\.


--
-- Data for Name: package_allowed_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.package_allowed_items (id, package_id, menu_item_id, variant_id, category_id, created_at) FROM stdin;
942b30d7-7088-4408-8c92-c1b0104b7c69	972d8e18-a4dd-45cf-b6a9-52ef4d1564a8	\N	\N	889427de-fb27-4ec3-b9f0-004816c8bc24	2026-01-31 13:07:06.214236+00
b688af79-0b2f-4862-bd2e-da962293eb7f	637ea375-e523-47da-9037-badcead90226	\N	\N	889427de-fb27-4ec3-b9f0-004816c8bc24	2026-01-31 13:32:31.992092+00
\.


--
-- Data for Name: package_meal_consumption; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.package_meal_consumption (id, customer_package_id, order_id, meals_consumed, consumed_at, order_total, order_items, created_at) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (id, key, value, description, created_at, updated_at) FROM stdin;
eb392598-7106-470a-8502-7d3e6be115a7	tier_thresholds	{"gold": 5000, "bronze": 0, "silver": 2000, "platinum": 10000}	Total spent thresholds for customer tier classification (Bronze, Silver, Gold, Platinum)	2026-01-30 07:29:18.339373+00	2026-01-30 07:29:18.339373+00
33474f13-c6cd-4816-b875-2fa8b740c3f3	vip_order_threshold	{"min_orders": 1000}	Minimum number of orders for a customer to be considered VIP	2026-01-30 07:29:18.339373+00	2026-01-30 07:50:13.39209+00
88a15f78-89b7-4825-8d34-dac1e125dc9d	loyalty_points_ratio	{"spend_amount": 10, "points_earned": 1}	How many loyalty points are earned per spend_amount rupees spent	2026-01-30 07:29:18.339373+00	2026-01-30 08:01:24.001069+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, first_name, last_name, role, is_active, last_login, created_at, updated_at) FROM stdin;
d901cbdb-101b-49e3-a421-4d01a572b77a	admin@robusters.com	$2b$12$uwgvJN2PiGdkDNeavW4k8eavMrNKpREXHCKd2KlweQ2NLPq/2/1GG	Robuster's	Admin	ADMIN	t	2026-04-21 16:02:11.23689+00	2026-01-26 10:05:07.857059+00	2026-04-21 16:02:11.23689+00
2bd751d5-32c1-4bbd-b083-2ad13f70bde2	ustad@robusters.com	$2b$12$RX989XvsovFhj9var0MnROEjI8j/t/AVSlzTd8qPlzQL5ByJ2jcsW	ustad	ggg	MANAGER	t	2026-01-29 10:39:54.545388+00	2026-01-26 10:09:29.305713+00	2026-01-29 10:39:54.545388+00
217c7097-1140-4918-a56d-e6d913722541	pardeep@robusters.com	$2b$12$3Etya1groq/QQSHBUokQruwvMW4iDoXQ3A5Fv6ni7lOtNwbq.hc12	Pardeep	singh	MANAGER	t	2026-04-16 10:33:20.63056+00	2026-04-10 11:40:02.00128+00	2026-04-16 10:33:20.63056+00
\.


--
-- Name: order_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_status_history_id_seq', 11, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: addons addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addons
    ADD CONSTRAINT addons_pkey PRIMARY KEY (id);


--
-- Name: addons addons_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addons
    ADD CONSTRAINT addons_slug_key UNIQUE (slug);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: category_addons category_addons_category_id_addon_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_addons
    ADD CONSTRAINT category_addons_category_id_addon_id_key UNIQUE (category_id, addon_id);


--
-- Name: category_addons category_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_addons
    ADD CONSTRAINT category_addons_pkey PRIMARY KEY (id);


--
-- Name: customer_meal_packages customer_meal_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_meal_packages
    ADD CONSTRAINT customer_meal_packages_pkey PRIMARY KEY (id);


--
-- Name: customer_orders customer_orders_customer_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_orders
    ADD CONSTRAINT customer_orders_customer_id_order_id_key UNIQUE (customer_id, order_id);


--
-- Name: customer_orders customer_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_orders
    ADD CONSTRAINT customer_orders_pkey PRIMARY KEY (id);


--
-- Name: customer_preferences customer_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_pkey PRIMARY KEY (id);


--
-- Name: customers customers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_email_key UNIQUE (email);


--
-- Name: customers customers_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_key UNIQUE (phone);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: item_addons item_addons_menu_item_id_addon_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_addons
    ADD CONSTRAINT item_addons_menu_item_id_addon_id_key UNIQUE (menu_item_id, addon_id);


--
-- Name: item_addons item_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_addons
    ADD CONSTRAINT item_addons_pkey PRIMARY KEY (id);


--
-- Name: item_variants item_variants_menu_item_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_variants
    ADD CONSTRAINT item_variants_menu_item_id_name_key UNIQUE (menu_item_id, name);


--
-- Name: item_variants item_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_variants
    ADD CONSTRAINT item_variants_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: meal_packages meal_packages_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_packages
    ADD CONSTRAINT meal_packages_name_key UNIQUE (name);


--
-- Name: meal_packages meal_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_packages
    ADD CONSTRAINT meal_packages_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_category_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_slug_key UNIQUE (category_id, slug);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_number_counters order_number_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_number_counters
    ADD CONSTRAINT order_number_counters_pkey PRIMARY KEY (date_key);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: package_activity_log package_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_activity_log
    ADD CONSTRAINT package_activity_log_pkey PRIMARY KEY (id);


--
-- Name: package_allowed_items package_allowed_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_allowed_items
    ADD CONSTRAINT package_allowed_items_pkey PRIMARY KEY (id);


--
-- Name: package_meal_consumption package_meal_consumption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_meal_consumption
    ADD CONSTRAINT package_meal_consumption_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_action ON public.package_activity_log USING btree (action);


--
-- Name: idx_activity_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_customer ON public.package_activity_log USING btree (customer_id);


--
-- Name: idx_activity_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_date ON public.package_activity_log USING btree (performed_at DESC);


--
-- Name: idx_activity_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_entity ON public.package_activity_log USING btree (entity_type, entity_id);


--
-- Name: idx_activity_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_user ON public.package_activity_log USING btree (performed_by);


--
-- Name: idx_addons_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addons_group ON public.addons USING btree (addon_group);


--
-- Name: idx_addons_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addons_slug ON public.addons USING btree (slug);


--
-- Name: idx_categories_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_display_order ON public.categories USING btree (display_order);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_category_addons_addon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_addons_addon ON public.category_addons USING btree (addon_id);


--
-- Name: idx_category_addons_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_addons_category ON public.category_addons USING btree (category_id);


--
-- Name: idx_consumption_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_date ON public.package_meal_consumption USING btree (consumed_at DESC);


--
-- Name: idx_consumption_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_order ON public.package_meal_consumption USING btree (order_id);


--
-- Name: idx_consumption_package; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_package ON public.package_meal_consumption USING btree (customer_package_id);


--
-- Name: idx_customer_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_orders_customer_id ON public.customer_orders USING btree (customer_id);


--
-- Name: idx_customer_orders_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_orders_order_id ON public.customer_orders USING btree (order_id);


--
-- Name: idx_customer_packages_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_packages_active ON public.customer_meal_packages USING btree (customer_id, status) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_customer_packages_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_packages_customer ON public.customer_meal_packages USING btree (customer_id);


--
-- Name: idx_customer_packages_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_packages_expiry ON public.customer_meal_packages USING btree (expires_at);


--
-- Name: idx_customer_packages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_packages_status ON public.customer_meal_packages USING btree (status);


--
-- Name: idx_customers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_active ON public.customers USING btree (is_active);


--
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_email ON public.customers USING btree (email);


--
-- Name: idx_customers_email_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_email_trgm ON public.customers USING gin (email public.gin_trgm_ops);


--
-- Name: idx_customers_first_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_first_name_trgm ON public.customers USING gin (first_name public.gin_trgm_ops);


--
-- Name: idx_customers_last_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_last_name_trgm ON public.customers USING gin (last_name public.gin_trgm_ops);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone);


--
-- Name: idx_customers_phone_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone_trgm ON public.customers USING gin (phone public.gin_trgm_ops);


--
-- Name: idx_item_addons_addon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_addons_addon ON public.item_addons USING btree (addon_id);


--
-- Name: idx_item_addons_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_addons_item ON public.item_addons USING btree (menu_item_id);


--
-- Name: idx_item_variants_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_variants_menu_item ON public.item_variants USING btree (menu_item_id);


--
-- Name: idx_locations_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_is_active ON public.locations USING btree (is_active);


--
-- Name: idx_meal_packages_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_packages_active ON public.meal_packages USING btree (is_active);


--
-- Name: idx_meal_packages_meal_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meal_packages_meal_count ON public.meal_packages USING btree (meal_count);


--
-- Name: idx_menu_items_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_available ON public.menu_items USING btree (is_available);


--
-- Name: idx_menu_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_category ON public.menu_items USING btree (category_id);


--
-- Name: idx_menu_items_description_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_description_trgm ON public.menu_items USING gin (description public.gin_trgm_ops);


--
-- Name: idx_menu_items_diet_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_diet_type ON public.menu_items USING btree (diet_type);


--
-- Name: idx_menu_items_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_name_trgm ON public.menu_items USING gin (name public.gin_trgm_ops);


--
-- Name: idx_order_items_menu_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_menu_item_id ON public.order_items USING btree (menu_item_id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_by ON public.orders USING btree (created_by);


--
-- Name: idx_orders_customer_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_name_trgm ON public.orders USING gin (customer_name public.gin_trgm_ops);


--
-- Name: idx_orders_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_phone ON public.orders USING btree (customer_phone);


--
-- Name: idx_orders_customer_phone_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_phone_trgm ON public.orders USING gin (customer_phone public.gin_trgm_ops);


--
-- Name: idx_orders_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_location_id ON public.orders USING btree (location_id);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_order_number_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_number_trgm ON public.orders USING gin (order_number public.gin_trgm_ops);


--
-- Name: idx_orders_package; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_package ON public.orders USING btree (customer_package_id) WHERE (customer_package_id IS NOT NULL);


--
-- Name: idx_package_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_package_items_category ON public.package_allowed_items USING btree (category_id);


--
-- Name: idx_package_items_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_package_items_item ON public.package_allowed_items USING btree (menu_item_id);


--
-- Name: idx_package_items_package; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_package_items_package ON public.package_allowed_items USING btree (package_id);


--
-- Name: idx_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settings_key ON public.settings USING btree (key);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: order_items trigger_calculate_order_totals_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_order_totals_delete AFTER DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.calculate_order_totals();


--
-- Name: order_items trigger_calculate_order_totals_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_order_totals_insert AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.calculate_order_totals();


--
-- Name: order_items trigger_calculate_order_totals_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_order_totals_update AFTER UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.calculate_order_totals();


--
-- Name: customer_meal_packages trigger_package_completion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_package_completion BEFORE UPDATE OF consumed_meals ON public.customer_meal_packages FOR EACH ROW EXECUTE FUNCTION public.check_package_completion();


--
-- Name: addons update_addons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addons_updated_at BEFORE UPDATE ON public.addons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_meal_packages update_customer_packages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_packages_updated_at BEFORE UPDATE ON public.customer_meal_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: item_variants update_item_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_item_variants_updated_at BEFORE UPDATE ON public.item_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: locations update_locations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: meal_packages update_meal_packages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meal_packages_updated_at BEFORE UPDATE ON public.meal_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_items update_menu_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: category_addons category_addons_addon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_addons
    ADD CONSTRAINT category_addons_addon_id_fkey FOREIGN KEY (addon_id) REFERENCES public.addons(id) ON DELETE CASCADE;


--
-- Name: category_addons category_addons_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_addons
    ADD CONSTRAINT category_addons_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: customer_meal_packages customer_meal_packages_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_meal_packages
    ADD CONSTRAINT customer_meal_packages_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: customer_meal_packages customer_meal_packages_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_meal_packages
    ADD CONSTRAINT customer_meal_packages_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_meal_packages customer_meal_packages_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_meal_packages
    ADD CONSTRAINT customer_meal_packages_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.meal_packages(id);


--
-- Name: customer_orders customer_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_orders
    ADD CONSTRAINT customer_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_orders customer_orders_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_orders
    ADD CONSTRAINT customer_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: customer_preferences customer_preferences_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: item_addons item_addons_addon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_addons
    ADD CONSTRAINT item_addons_addon_id_fkey FOREIGN KEY (addon_id) REFERENCES public.addons(id) ON DELETE CASCADE;


--
-- Name: item_addons item_addons_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_addons
    ADD CONSTRAINT item_addons_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: item_variants item_variants_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_variants
    ADD CONSTRAINT item_variants_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: meal_packages meal_packages_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_packages
    ADD CONSTRAINT meal_packages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_cancellation_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_cancellation_requested_by_fkey FOREIGN KEY (cancellation_requested_by) REFERENCES public.users(id);


--
-- Name: orders orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: orders orders_customer_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_package_id_fkey FOREIGN KEY (customer_package_id) REFERENCES public.customer_meal_packages(id);


--
-- Name: orders orders_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: package_activity_log package_activity_log_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_activity_log
    ADD CONSTRAINT package_activity_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: package_activity_log package_activity_log_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_activity_log
    ADD CONSTRAINT package_activity_log_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.meal_packages(id);


--
-- Name: package_activity_log package_activity_log_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_activity_log
    ADD CONSTRAINT package_activity_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: package_allowed_items package_allowed_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_allowed_items
    ADD CONSTRAINT package_allowed_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: package_allowed_items package_allowed_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_allowed_items
    ADD CONSTRAINT package_allowed_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: package_allowed_items package_allowed_items_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_allowed_items
    ADD CONSTRAINT package_allowed_items_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.meal_packages(id) ON DELETE CASCADE;


--
-- Name: package_allowed_items package_allowed_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_allowed_items
    ADD CONSTRAINT package_allowed_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.item_variants(id) ON DELETE SET NULL;


--
-- Name: package_meal_consumption package_meal_consumption_customer_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_meal_consumption
    ADD CONSTRAINT package_meal_consumption_customer_package_id_fkey FOREIGN KEY (customer_package_id) REFERENCES public.customer_meal_packages(id) ON DELETE CASCADE;


--
-- Name: package_meal_consumption package_meal_consumption_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_meal_consumption
    ADD CONSTRAINT package_meal_consumption_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- PostgreSQL database dump complete
--

\unrestrict L5h84BEtXDfL6D4GsJmtYutgU2cdPnMEOSIu4lCubeN1YqzwJUA44bv1ykAA0ZT

