-- =============================================================================
-- Yessyfy Production Schema — SurrealDB 3.0
-- Pipeline order: tables → fields → indexes → functions → events → seed
-- =============================================================================

-- Core Domain Tables
DEFINE TABLE user                 SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE technician_record    SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE job_order            SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE photo_qa_evidence    SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE escrow_account       SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE escrow_entry         SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE warranty_certificate SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE tax_invoice          SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE audit_log            SCHEMAFULL PERMISSIONS FULL;

-- Legacy / Template Tables (Retained for template compatibility)
DEFINE TABLE item                 SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE tag                  SCHEMAFULL PERMISSIONS FULL;
DEFINE TABLE comment              SCHEMAFULL TYPE RELATION IN user OUT item PERMISSIONS FULL;
DEFINE TABLE likes                SCHEMAFULL TYPE RELATION IN user OUT item PERMISSIONS FULL;

-- -----------------------------------------------------------------------------
-- USER ENTITY
-- -----------------------------------------------------------------------------
DEFINE FIELD phone         ON user TYPE string ASSERT string::is_phone($value);
DEFINE FIELD email         ON user TYPE option<string> ASSERT $value = NONE OR string::is_email($value);
DEFINE FIELD username      ON user TYPE option<string>;
DEFINE FIELD full_name     ON user TYPE string;
DEFINE FIELD role          ON user TYPE string ASSERT $value IN ['customer', 'collaborator', 'operator', 'admin', 'owner', 'user'];
DEFINE FIELD status        ON user TYPE string DEFAULT 'active' ASSERT $value IN ['active', 'suspended', 'banned', 'pending_kyc'];
DEFINE FIELD rfc           ON user TYPE option<string>;
DEFINE FIELD curp          ON user TYPE option<string>;
DEFINE FIELD avatar_url    ON user TYPE option<string>;
DEFINE FIELD locale        ON user TYPE string DEFAULT 'es-MX';
DEFINE FIELD created_at    ON user TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at    ON user TYPE datetime DEFAULT time::now() VALUE time::now();

DEFINE INDEX user_phone_idx ON user FIELDS phone UNIQUE;
DEFINE INDEX user_rfc_idx   ON user FIELDS rfc;

-- -----------------------------------------------------------------------------
-- TECHNICIAN RECORD (Colaborador Independiente)
-- -----------------------------------------------------------------------------
DEFINE FIELD user              ON technician_record TYPE record<user> REFERENCE ON DELETE CASCADE;
DEFINE FIELD trades            ON technician_record TYPE array<string>;
DEFINE FIELD kyc_status        ON technician_record TYPE string DEFAULT 'unsubmitted'
    ASSERT $value IN ['unsubmitted', 'submitted', 'verified', 'rejected'];
DEFINE FIELD kyc_documents     ON technician_record TYPE object;
DEFINE FIELD kyc_documents.ine_front_url   ON technician_record TYPE option<string>;
DEFINE FIELD kyc_documents.ine_back_url    ON technician_record TYPE option<string>;
DEFINE FIELD kyc_documents.selfie_url      ON technician_record TYPE option<string>;
DEFINE FIELD kyc_documents.proof_address   ON technician_record TYPE option<string>;
DEFINE FIELD kyc_documents.tax_situation   ON technician_record TYPE option<string>;
DEFINE FIELD clabe             ON technician_record TYPE option<string> ASSERT $value = NONE OR string::len($value) = 18;
DEFINE FIELD operational_state ON technician_record TYPE string DEFAULT 'offline'
    ASSERT $value IN ['offline', 'idle', 'dispatched', 'on_job', 'suspended'];
DEFINE FIELD current_location  ON technician_record TYPE option<geometry<point>>;
DEFINE FIELD rating_avg        ON technician_record TYPE float DEFAULT 5.0;
DEFINE FIELD jobs_completed    ON technician_record TYPE int DEFAULT 0;
DEFINE FIELD cancellation_rate ON technician_record TYPE float DEFAULT 0.0;
DEFINE FIELD updated_at        ON technician_record TYPE datetime DEFAULT time::now() VALUE time::now();

DEFINE INDEX tech_user_idx ON technician_record FIELDS user UNIQUE;

-- -----------------------------------------------------------------------------
-- JOB ORDER (6-Node Closed Loop)
-- -----------------------------------------------------------------------------
DEFINE FIELD code              ON job_order TYPE string;
DEFINE FIELD customer          ON job_order TYPE record<user>;
DEFINE FIELD collaborator      ON job_order TYPE option<record<user>>;
DEFINE FIELD category          ON job_order TYPE string ASSERT $value IN [
    'plomeria', 'electricidad', 'cerrajeria', 'jardineria', 'mantenimiento_hogar', 'albanileria'
];
DEFINE FIELD location_type     ON job_order TYPE string DEFAULT 'residencial' 
    ASSERT $value IN ['residencial', 'comercial', 'premium'];
DEFINE FIELD urgency           ON job_order TYPE string DEFAULT 'normal' 
    ASSERT $value IN ['normal', 'mismo_dia', 'emergencia_24_7'];
DEFINE FIELD status            ON job_order TYPE string DEFAULT 'draft' ASSERT $value IN [
    'draft', 'pending_triage', 'dispatched', 'accepted', 'en_camino', 
    'in_progress', 'winding_down', 'pending_validation', 'validated', 
    'completed', 'disputed', 'cancelled'
];
DEFINE FIELD coordinates       ON job_order TYPE geometry<point>;
DEFINE FIELD address_text      ON job_order TYPE string;
DEFINE FIELD postal_code       ON job_order TYPE string ASSERT string::len($value) = 5;
DEFINE FIELD description       ON job_order TYPE string;

-- Monetary values in Integer Centavos (MXN)
DEFINE FIELD base_budget_cents        ON job_order TYPE int;
DEFINE FIELD supplemental_cents       ON job_order TYPE int DEFAULT 0;
DEFINE FIELD total_customer_cents     ON job_order TYPE int;
DEFINE FIELD platform_fee_cents       ON job_order TYPE int;
DEFINE FIELD collaborator_gross_cents ON job_order TYPE int;
DEFINE FIELD isr_withheld_cents       ON job_order TYPE int DEFAULT 0;
DEFINE FIELD iva_withheld_cents       ON job_order TYPE int DEFAULT 0;
DEFINE FIELD collaborator_net_cents   ON job_order TYPE int;

DEFINE FIELD created_at        ON job_order TYPE datetime DEFAULT time::now();
DEFINE FIELD scheduled_for     ON job_order TYPE option<datetime>;
DEFINE FIELD dispatched_at     ON job_order TYPE option<datetime>;
DEFINE FIELD arrived_at        ON job_order TYPE option<datetime>;
DEFINE FIELD completed_at      ON job_order TYPE option<datetime>;

DEFINE INDEX job_code_idx   ON job_order FIELDS code UNIQUE;
DEFINE INDEX job_status_idx ON job_order FIELDS status;
DEFINE INDEX job_cust_idx   ON job_order FIELDS customer;
DEFINE INDEX job_colab_idx  ON job_order FIELDS collaborator;

-- -----------------------------------------------------------------------------
-- PHOTO QA EVIDENCE
-- -----------------------------------------------------------------------------
DEFINE FIELD job_order         ON photo_qa_evidence TYPE record<job_order>;
DEFINE FIELD phase             ON photo_qa_evidence TYPE string 
    ASSERT $value IN ['diagnostic_before', 'work_progress', 'proof_finished'];
DEFINE FIELD image_url         ON photo_qa_evidence TYPE string;
DEFINE FIELD thumbnail_url     ON photo_qa_evidence TYPE string;
DEFINE FIELD sha256_checksum   ON photo_qa_evidence TYPE string;
DEFINE FIELD captured_at       ON photo_qa_evidence TYPE datetime;
DEFINE FIELD captured_location ON photo_qa_evidence TYPE option<geometry<point>>;
DEFINE FIELD verified_by_ops   ON photo_qa_evidence TYPE bool DEFAULT false;
DEFINE FIELD ops_reviewer      ON photo_qa_evidence TYPE option<record<user>>;
DEFINE FIELD created_at        ON photo_qa_evidence TYPE datetime DEFAULT time::now();

-- -----------------------------------------------------------------------------
-- DOUBLE-ENTRY ESCROW LEDGER
-- -----------------------------------------------------------------------------
DEFINE FIELD account_type      ON escrow_account TYPE string ASSERT $value IN [
    'customer_funds_payable', 'escrow_transit', 'platform_commission_income',
    'gateway_expense', 'sat_tax_payable', 'collaborator_payable', 'dispute_reserve'
];
DEFINE FIELD balance_cents     ON escrow_account TYPE int DEFAULT 0;
DEFINE FIELD currency          ON escrow_account TYPE string DEFAULT 'MXN';
DEFINE FIELD updated_at        ON escrow_account TYPE datetime DEFAULT time::now() VALUE time::now();

DEFINE FIELD transaction_id    ON escrow_entry TYPE string;
DEFINE FIELD idempotency_key   ON escrow_entry TYPE string;
DEFINE FIELD job_order         ON escrow_entry TYPE option<record<job_order>>;
DEFINE FIELD debit_account     ON escrow_entry TYPE record<escrow_account>;
DEFINE FIELD credit_account    ON escrow_entry TYPE record<escrow_account>;
DEFINE FIELD amount_cents      ON escrow_entry TYPE int ASSERT $value > 0;
DEFINE FIELD memo              ON escrow_entry TYPE string;
DEFINE FIELD created_at        ON escrow_entry TYPE datetime DEFAULT time::now();

DEFINE INDEX entry_idemp_idx ON escrow_entry FIELDS idempotency_key UNIQUE;
DEFINE INDEX entry_tx_idx    ON escrow_entry FIELDS transaction_id;

-- -----------------------------------------------------------------------------
-- WARRANTY CERTIFICATE & CFDI INVOICE
-- -----------------------------------------------------------------------------
DEFINE FIELD certificate_number ON warranty_certificate TYPE string;
DEFINE FIELD job_order          ON warranty_certificate TYPE record<job_order>;
DEFINE FIELD customer           ON warranty_certificate TYPE record<user>;
DEFINE FIELD collaborator       ON warranty_certificate TYPE record<user>;
DEFINE FIELD valid_from         ON warranty_certificate TYPE datetime;
DEFINE FIELD valid_until        ON warranty_certificate TYPE datetime;
DEFINE FIELD status             ON warranty_certificate TYPE string DEFAULT 'active'
    ASSERT $value IN ['active', 'claimed', 'serviced', 'voided', 'expired'];
DEFINE FIELD terms_hash         ON warranty_certificate TYPE string;
DEFINE FIELD created_at         ON warranty_certificate TYPE datetime DEFAULT time::now();

DEFINE INDEX war_num_idx ON warranty_certificate FIELDS certificate_number UNIQUE;

DEFINE FIELD job_order          ON tax_invoice TYPE record<job_order>;
DEFINE FIELD cfdi_type          ON tax_invoice TYPE string ASSERT $value IN ['ingreso_comision', 'retencion_plataforma'];
DEFINE FIELD uuid               ON tax_invoice TYPE string;
DEFINE FIELD rfc_emisor         ON tax_invoice TYPE string;
DEFINE FIELD rfc_receptor       ON tax_invoice TYPE string;
DEFINE FIELD total_cents        ON tax_invoice TYPE int;
DEFINE FIELD xml_url            ON tax_invoice TYPE string;
DEFINE FIELD pdf_url            ON tax_invoice TYPE string;
DEFINE FIELD pac_response_code  ON tax_invoice TYPE string;
DEFINE FIELD stamped_at         ON tax_invoice TYPE datetime;
DEFINE FIELD created_at         ON tax_invoice TYPE datetime DEFAULT time::now();

DEFINE INDEX cfdi_uuid_idx ON tax_invoice FIELDS uuid UNIQUE;

-- -----------------------------------------------------------------------------
-- AUDIT TRAILS & FULLTEXT SEARCH
-- -----------------------------------------------------------------------------
DEFINE FIELD action_type       ON audit_log TYPE string;
DEFINE FIELD actor             ON audit_log TYPE record<user>;
DEFINE FIELD target_entity     ON audit_log TYPE string;
DEFINE FIELD target_id         ON audit_log TYPE string;
DEFINE FIELD previous_state    ON audit_log TYPE option<object>;
DEFINE FIELD new_state         ON audit_log TYPE option<object>;
DEFINE FIELD ip_address        ON audit_log TYPE option<string>;
DEFINE FIELD created_at        ON audit_log TYPE datetime DEFAULT time::now();

DEFINE ANALYZER ysf_spanish
    TOKENIZERS class, punct
    FILTERS lowercase, snowball(spanish);

DEFINE INDEX job_desc_search ON job_order
    FIELDS description FULLTEXT ANALYZER ysf_spanish;

-- -----------------------------------------------------------------------------
-- TEMPLATE RETENTION (Item & Tag)
-- -----------------------------------------------------------------------------
DEFINE FIELD name ON tag TYPE string;
DEFINE FIELD slug ON tag TYPE string;
DEFINE FIELD title ON item TYPE string;
DEFINE FIELD description ON item TYPE option<string>;
DEFINE FIELD status ON item TYPE string ASSERT $value IN ['draft', 'active', 'archived'];
DEFINE FIELD tags ON item TYPE array<record<tag>>;
DEFINE FIELD coordinates ON item TYPE option<geometry<point>>;
DEFINE FIELD rating ON item TYPE float DEFAULT 0;
DEFINE FIELD comment_count ON item TYPE int DEFAULT 0;
DEFINE FIELD created_at ON item TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON item TYPE datetime DEFAULT time::now() VALUE time::now();
DEFINE FIELD rating ON comment TYPE int ASSERT $value >= 1 AND $value <= 5;
DEFINE FIELD body ON comment TYPE option<string>;
DEFINE FIELD created_at ON comment TYPE datetime DEFAULT time::now();
DEFINE FIELD updated_at ON comment TYPE datetime DEFAULT time::now() VALUE time::now();
