/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const axios = require("axios");
module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: { currentPage, pageSize }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM register_distributor ${whereClause}`;


      let queryDataTable = `SELECT a.register_distributor_id, a.isactive, a.created, a.createdby, a.updated,
                            a.updatedby, a.first_name, a.last_name, d.nama as title, a.street, a.housenumber,
                            a.district, a.city, a.country,
                            CASE WHEN b.r_general_state_id IS NULL THEN a.state ELSE b.nama END AS state,
                            CASE WHEN c.r_transport_zone_id IS NULL THEN a.transport_zone ELSE c.nama END AS transport_zone,
                            a.telepon, a.mobile,
                            CASE WHEN a.email1='undefined' THEN '' ELSE a.email1 END email1, 
                            CASE WHEN a.email2='undefined' THEN '' ELSE a.email2 END email2,
                            CASE WHEN a.email3='undefined' THEN '' ELSE a.email3 END email3
                            FROM register_distributor a
                            LEFT JOIN r_general_state b ON(a.state = b.r_general_state_id)
                            LEFT JOIN r_transport_zone c ON(a.transport_zone = c.r_transport_zone_id)
                            LEFT JOIN r_tittle d ON(a.title = d.r_tittle_id)
                            ${whereClause}
                            ORDER BY a.created DESC
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;
      console.log(queryDataTable);
      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;      
      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        for (let index = 0; index < rows.length; index++) {
          let register_distributor_id = rows[index].register_distributor_id;
          let approveSales = `SELECT a.sales_cekregister_id, a.isactive, a.created, a.createdby,
          a.updated, a.updatedby, a.register_distributor_id, a.id_sales_distributor, 
          g.r_sales_district_id,
          g.nama AS sales_district,
          l.nama AS sales_organization, 
          a.currency,
          a.customer_group,
          a.r_distribution_channel_id,
          b.nama AS distribution_channel, 
          i.r_price_group_id,
          i.nama AS price_group,
          c.r_division_id,
          c.nama AS division, 
          a.price_procedure_determine, 
          a.invoice_list_schedule,
          a.transport_zone, 
          a.tax_number, 
          a.shipping_condition, 
          e.r_payment_term_id,
          f.r_delivery_plant_id,
          e.nama AS payment_term, 
          a.tax_category,
          f.nama AS delivery_plant, 
          d.r_acct_assign_group_id,
          d.nama AS account_assignment_group,
          j.r_tax_clasification_id,
          j.nama AS tax_classification,
          a.invoice_date,
          h.r_partner_function_id,
          h.nama AS partner_function,
          b.kode as kode_distribution_chanel,
          b.nama as nama_distribution_chanel,
          k.r_bp_role_id,
          k.nama AS bp_role,
          l.r_sales_organisasi_id,
          CONCAT(d.planning_group_kode,' - ',d.planning_group_nama) AS planning_group,
          CONCAT(d.reconciliation_account_kode,' - ',d.reconciliation_account_nama) AS reconciliation_account
          FROM sales_cekregister a
          LEFT JOIN r_distribution_channel b ON(a.r_distribution_channel_id = b.r_distribution_channel_id)
          LEFT JOIN r_division c ON(a.division = c.r_division_id)
          LEFT JOIN r_acct_assign_group d ON(a.account_assignment_group = d.r_acct_assign_group_id)
          LEFT JOIN r_payment_term e ON(a.payment_term = e.r_payment_term_id)
          LEFT JOIN r_delivery_plant f ON(a.delivery_plant = f.r_delivery_plant_id)
          LEFT JOIN r_sales_district g ON(a.sales_district = g.r_sales_district_id)
          LEFT JOIN r_partner_function h ON(a.partner_function = h.r_partner_function_id)
          LEFT JOIN r_price_group i ON(a.price_group = i.r_price_group_id)
          LEFT JOIN r_tax_clasification j ON(a.tax_classification = j.r_tax_clasification_id)
          LEFT JOIN r_bp_role k ON(a.bp_role = k.r_bp_role_id)
          LEFT JOIN r_sales_organisasi l ON(a.sales_organization = l.r_sales_organisasi_id)
          WHERE a.register_distributor_id = '${register_distributor_id}'
          `;
          let salesdata = await request.query(approveSales);


          let approveFinance = `SELECT 
          a.finance_cekregister_id, a.isactive, a.created,
          a.createdby, a.updated, a.updatedby, 
          a.register_distributor_id,
          a.reference_nama,
          a.account_holder,
          a.id_accounting_distributor, 
          roles.r_bp_role_id,
          CASE WHEN roles.r_bp_role_id IS NOT NULL THEN roles.nama END AS bp_role,
          a.payment_history_record, 
          CONCAT(rac.reconciliation_account_kode,'-',rac.nama) AS afff,
          rac.planning_group_kode,
          CONCAT(rbc.kode,'-',rbc.nama) AS bank_country, 
          rbc.r_bank_country_id,
          CONCAT(rbk.kode_country,'-',rbk.kode_bank,'-',rbk.nama) AS bank_key, 
          rbk.r_bank_key_id,
          a.account,
          a.iban, 
          COALESCE(scr.payment_term,a.r_payment_term_id) AS r_payment_term_id,
          COALESCE(CONCAT(term2.kode,'-',term2.nama),CONCAT(term.kode,'-',term.nama)) AS payment_term,
          rac.identification_number_zbenst_id,
          CASE WHEN a.identification_number_zbenst_id IS NOT NULL THEN CONCAT(zbenst.kode,'-',zbenst.nama) END AS identification_number_zbenst,
          a.identification_number_zbenty_id,
          CASE WHEN a.identification_number_zbenty_id IS NOT NULL THEN CONCAT(zbenty.kode,'-',zbenty.nama) END  AS identification_number_zbenty,
          a.identification_number_zcharg_id,
          CASE WHEN a.identification_number_zcharg_id IS NOT NULL THEN CONCAT(zcharg.kode,'-',zcharg.nama) END AS identification_number_zcharg,
          a.identification_number_zrgtyp_id,
          CASE WHEN a.identification_number_zrgtyp_id IS NOT NULL THEN CONCAT(zrgtyp.kode,'-',zrgtyp.nama) END AS identification_number_zrgtyp,
          scr.tax_number AS identification_type,
          CONCAT(rac.planning_group_kode,' - ',rac.planning_group_nama) AS planning_group,
          CONCAT(rac.reconciliation_account_kode,' - ',rac.reconciliation_account_nama) AS reconciliation_account,
          CONCAT(l.kode,'-',l.nama) AS company_code
          FROM register_distributor rd
          LEFT JOIN sales_cekregister scr ON(rd.register_distributor_id = scr.register_distributor_id)
          LEFT JOIN r_acct_assign_group rac ON(rac.r_acct_assign_group_id = scr.account_assignment_group)
          LEFT JOIN finance_cekregister a ON(rd.register_distributor_id = a.register_distributor_id)
          LEFT JOIN r_sales_organisasi l ON(scr.sales_organization = l.r_sales_organisasi_id)
          LEFT JOIN r_identification_number_zbenst zbenst ON(zbenst.r_identification_number_zbenst_id = rac.identification_number_zbenst_id)
          LEFT JOIN r_identification_number_zbenty zbenty ON(zbenty.r_identification_number_zbenty_id = a.identification_number_zbenty_id)
          LEFT JOIN r_identification_number_zcharg zcharg ON(zcharg.r_identification_number_zcharg_id = a.identification_number_zcharg_id)
          LEFT JOIN r_identification_number_zrgtyp zrgtyp ON(zrgtyp.r_identification_number_zrgtyp_id = a.identification_number_zrgtyp_id)
          LEFT JOIN r_payment_term term ON(term.r_payment_term_id = a.r_payment_term_id)
          LEFT JOIN r_payment_term term2 ON(term2.r_payment_term_id = scr.payment_term)
          LEFT JOIN r_bp_role roles ON(roles.r_bp_role_id = a.bp_role)
          LEFT JOIN r_bank_country rbc ON(rbc.r_bank_country_id = a.bank_country)
          LEFT JOIN r_bank_key rbk ON(rbk.r_bank_key_id = a.bank_key)
          WHERE rd.register_distributor_id = '${register_distributor_id}'`;
          
          let financedata = await request.query(approveFinance);

          let approveLogistik= `SELECT a.logistik_cekregister_id,
          a.isactive, a.created, a.createdby, a.updated,
          a.updatedby, a.register_distributor_id, a.r_kendaraan_id, a.islcl,rk.kode,rk.nama
          FROM logistik_cekregister a
          LEFT JOIN r_kendaraan rk ON(rk.r_kendaraan_id = a.r_kendaraan_id)
          WHERE a.register_distributor_id = '${register_distributor_id}'`;
          let logistikdata = await request.query(approveLogistik);


          rows[index].salesdata = salesdata.recordset[0];
          rows[index].financedata = financedata.recordset[0];
          rows[index].logistikdata = logistikdata.recordset;
          

        }




        /**
         * {
         *    result : data utama,
         *    meta : data tambahan ( optional ),
         *    status : status response ( optional),
         *    message : pesan ( optional )
         * }
         */
        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // GET ONE RESOURCE
  findOne: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT a.register_distributor_id, a.isactive, a.created, a.createdby, a.updated,
      a.updatedby, a.first_name, a.last_name, d.nama as title, a.street, a.housenumber,
      a.district, a.city, a.country,
      CASE WHEN b.r_general_state_id IS NULL THEN a.state ELSE b.nama END AS state,
      CASE WHEN c.r_transport_zone_id IS NULL THEN a.transport_zone ELSE c.nama END AS transport_zone,
      a.telepon, a.mobile,
      a.email1, a.email2, a.email3
      FROM register_distributor a
      LEFT JOIN r_general_state b ON(a.state = b.r_general_state_id)
      LEFT JOIN r_transport_zone c ON(a.transport_zone = c.r_transport_zone_id)
      LEFT JOIN r_tittle d ON(a.title = d.r_tittle_id)
      WHERE a.register_distributor_id='${req.param(
        "id"
      )}'`;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];


          let register_distributor_id = row.register_distributor_id;
          let approveSales = `SELECT a.sales_cekregister_id, a.isactive, a.created, a.createdby,
          a.updated, a.updatedby, a.register_distributor_id, a.id_sales_distributor, 
          g.r_sales_district_id,
          CONCAT(g.kode,'-',g.nama) AS sales_district,
          CONCAT(l.kode,'-',l.nama) AS sales_organization, 
          a.currency, 
          a.customer_group,
          a.r_distribution_channel_id, 
          CONCAT(b.kode,'-',b.nama) AS distribution_channel,
          i.r_price_group_id,
          CONCAT(i.kode,'-',i.nama) AS price_group,
          c.r_division_id,
          e.r_payment_term_id,
          f.r_delivery_plant_id,
          CONCAT(e.kode,'-',e.nama) AS payment_term,
          CONCAT(f.kode,'-',f.nama) AS delivery_plant, 
          CONCAT(c.kode,'-',c.nama) AS division, a.price_procedure_determine, a.invoice_list_schedule,
          a.transport_zone, a.tax_number, a.shipping_condition, a.tax_category,
          d.r_acct_assign_group_id, CONCAT(d.kode,'-',d.nama) AS account_assignment_group, 
          j.r_tax_clasification_id,
          CONCAT(j.kode,'-',j.nama) AS tax_classification,
          a.invoice_date,
          h.r_partner_function_id,
          CONCAT(h.kode,'-',h.nama) AS partner_function,
          b.kode as kode_distribution_chanel,b.nama as nama_distribution_chanel,
          k.r_bp_role_id,
          k.nama AS bp_role,
          l.r_sales_organisasi_id,
          CONCAT(d.planning_group_kode,' - ',d.planning_group_nama) AS planning_group,
          CONCAT(d.reconciliation_account_kode,' - ',d.reconciliation_account_nama) AS reconciliation_account,
          CONCAT(l.kode,'-',l.nama) AS company_code
          FROM sales_cekregister a
          LEFT JOIN r_distribution_channel b ON(a.r_distribution_channel_id = b.r_distribution_channel_id)
          LEFT JOIN r_division c ON(a.division = c.r_division_id)
          LEFT JOIN r_acct_assign_group d ON(a.account_assignment_group = d.r_acct_assign_group_id)
          LEFT JOIN r_payment_term e ON(a.payment_term = e.r_payment_term_id)
          LEFT JOIN r_delivery_plant f ON(a.delivery_plant = f.r_delivery_plant_id)
          LEFT JOIN r_sales_district g ON(a.sales_district = g.r_sales_district_id)
          LEFT JOIN r_partner_function h ON(a.partner_function = h.r_partner_function_id)
          LEFT JOIN r_price_group i ON(a.price_group = i.r_price_group_id)
          LEFT JOIN r_tax_clasification j ON(a.tax_classification = j.r_tax_clasification_id)
          LEFT JOIN r_bp_role k ON(a.bp_role = k.r_bp_role_id)
          LEFT JOIN r_sales_organisasi l ON(a.sales_organization = l.r_sales_organisasi_id)
          WHERE a.register_distributor_id = '${register_distributor_id}'`;
          let salesdata = await request.query(approveSales);

          let approveFinance = `SELECT 
          a.finance_cekregister_id, a.isactive, a.created,
          a.createdby, a.updated, a.updatedby, 
          a.register_distributor_id,
          a.reference_nama,
          a.account_holder,
          a.id_accounting_distributor, 
          roles.r_bp_role_id,
          CASE WHEN roles.r_bp_role_id IS NOT NULL THEN roles.nama END AS bp_role,
          CONCAT(l.kode,'-',l.nama) AS company_code,
          a.payment_history_record, 
          CONCAT(rac.reconciliation_account_kode,'-',rac.nama) AS afff,
          rac.planning_group_kode,
          CONCAT(rbc.kode,'-',rbc.nama) AS bank_country, 
          rbc.r_bank_country_id,
          CONCAT(rbk.kode_country,'-',rbk.kode_bank,'-',rbk.nama) AS bank_key, 
          rbk.r_bank_key_id,
          a.account,
          a.iban, 
          COALESCE(scr.payment_term,a.r_payment_term_id) AS r_payment_term_id,
          COALESCE(CONCAT(term2.kode,'-',term2.nama),CONCAT(term.kode,'-',term.nama)) AS payment_term,
          rac.identification_number_zbenst_id,
          CASE WHEN a.identification_number_zbenst_id IS NOT NULL THEN CONCAT(zbenst.kode,'-',zbenst.nama) END AS identification_number_zbenst,
          a.identification_number_zbenty_id,
          CASE WHEN a.identification_number_zbenty_id IS NOT NULL THEN CONCAT(zbenty.kode,'-',zbenty.nama) END  AS identification_number_zbenty,
          a.identification_number_zcharg_id,
          CASE WHEN a.identification_number_zcharg_id IS NOT NULL THEN CONCAT(zcharg.kode,'-',zcharg.nama) END AS identification_number_zcharg,
          a.identification_number_zrgtyp_id,
          CASE WHEN a.identification_number_zrgtyp_id IS NOT NULL THEN CONCAT(zrgtyp.kode,'-',zrgtyp.nama) END AS identification_number_zrgtyp,
          scr.tax_number AS identification_type,
          CONCAT(rac.planning_group_kode,' - ',rac.planning_group_nama) AS planning_group,
          CONCAT(rac.reconciliation_account_kode,' - ',rac.reconciliation_account_nama) AS reconciliation_account
          FROM register_distributor rd
          LEFT JOIN sales_cekregister scr ON(rd.register_distributor_id = scr.register_distributor_id)
          LEFT JOIN r_acct_assign_group rac ON(rac.r_acct_assign_group_id = scr.account_assignment_group)
          LEFT JOIN finance_cekregister a ON(rd.register_distributor_id = a.register_distributor_id)
          LEFT JOIN r_sales_organisasi l ON(scr.sales_organization = l.r_sales_organisasi_id)
          LEFT JOIN r_identification_number_zbenst zbenst ON(zbenst.r_identification_number_zbenst_id = rac.identification_number_zbenst_id)
          LEFT JOIN r_identification_number_zbenty zbenty ON(zbenty.r_identification_number_zbenty_id = a.identification_number_zbenty_id)
          LEFT JOIN r_identification_number_zcharg zcharg ON(zcharg.r_identification_number_zcharg_id = a.identification_number_zcharg_id)
          LEFT JOIN r_identification_number_zrgtyp zrgtyp ON(zrgtyp.r_identification_number_zrgtyp_id = a.identification_number_zrgtyp_id)
          LEFT JOIN r_payment_term term ON(term.r_payment_term_id = a.r_payment_term_id)
          LEFT JOIN r_payment_term term2 ON(term2.r_payment_term_id = scr.payment_term)
          LEFT JOIN r_bp_role roles ON(roles.r_bp_role_id = a.bp_role)
          LEFT JOIN r_bank_country rbc ON(rbc.r_bank_country_id = a.bank_country)
          LEFT JOIN r_bank_key rbk ON(rbk.r_bank_key_id = a.bank_key)
          WHERE rd.register_distributor_id = '${register_distributor_id}'`;
          let financedata = await request.query(approveFinance);
          row.salesdata = salesdata.recordset[0];
          row.financedata = financedata.recordset[0];



        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  // CREATE NEW RESOURCE
  new: async function(req, res) {
    const {first_name, last_name, title,
        street, housenumber, district, city, state, transport_zone,
        telepon, mobile, email1, email2, email3} = req.body;
      
      
    await DB.poolConnect;
    try {

      let country = 'INDONESIA';
      let register_distributor_id = uuid();
      const request = DB.pool.request();
      const sql = `INSERT INTO register_distributor
      (register_distributor_id, first_name, last_name, title,
      street, housenumber, district, city, country, state,
      transport_zone, telepon, mobile, email1, email2, email3)
      VALUES('${register_distributor_id}', '${first_name}', '${last_name}', '${title}', '${street}',
      '${housenumber}', '${district}', '${city}', '${country}', '${state}', '${transport_zone}',
      '${telepon}','${mobile}','${email1}','${email2}','${email3}')`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }

        return res.success({
          data: result,
          message: "Insert data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  
  approveSales: async function(req, res) {
    const {register_distributor_id,
      m_user_id,
      id_sales_distributor, sales_district,
      sales_organization, currency, r_distribution_channel_id, price_group,
      division, price_procedure_determine, invoice_list_schedule, transport_zone,
      tax_number, shipping_condition, payment_term, tax_category, delivery_plant,
      account_assignment_group, tax_classification, invoice_date, 
      partner_function,bp_role,customer_group} = req.body;
      
    await DB.poolConnect;
    try {

      const request = DB.pool.request();

      await request.query(`DELETE FROM sales_cekregister WHERE register_distributor_id = '${register_distributor_id}'`);
      const sql = `INSERT INTO sales_cekregister
      (register_distributor_id,createdby,updatedby,id_sales_distributor, sales_district,
      sales_organization, currency, r_distribution_channel_id, price_group,
      division, price_procedure_determine, invoice_list_schedule, transport_zone,
      tax_number, shipping_condition, payment_term, tax_category, delivery_plant,
      account_assignment_group, tax_classification, invoice_date, 
      partner_function,bp_role,customer_group)
      VALUES('${register_distributor_id}',
      '${m_user_id}',
      '${m_user_id}',
      '${id_sales_distributor}',
      '${sales_district}', '${sales_organization}', '${currency}',
      '${r_distribution_channel_id}',
      '${price_group}',
      '${division}', '${price_procedure_determine}', '${invoice_list_schedule}',
      '${transport_zone}', '${tax_number}', '${shipping_condition}',
      '${payment_term}', '${tax_category}', '${delivery_plant}',
      '${account_assignment_group}', '${tax_classification}',
      '${invoice_date}', '${partner_function}','${bp_role}','${customer_group}')`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }

        return res.success({
          data: result,
          message: "Insert data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  approveAccounting: async function(req, res) {
    const {m_user_id,
      register_distributor_id, 
      id_accounting_distributor,
      reference_nama,
      account_holder,
      r_bp_role_id, 
      company_code,
      payment_history_record,
      planning_group, bank_country, 
      bank_key, account,
      iban,
      identification_number_zbenst_id,
      identification_number_zbenty_id,
      identification_number_zcharg_id,
      identification_number_zrgtyp_id,
      identification_type,
      r_payment_term_id,
      r_bank_country_id,
      r_bank_key_id} = req.body;
      
      console.log(req.body);
      
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      // let cekdata = await request.query(`SELECT COUNT(1) AS total_rows FROM finance_cekregister WHERE register_distributor_id = '${register_distributor_id}'`);
      // const totalRows = cekdata.recordset[0].total_rows;

      //if(totalRows > 0 ){
        await request.query(`DELETE FROM finance_cekregister WHERE register_distributor_id = '${register_distributor_id}'`);
      //}

      const sql = `INSERT INTO finance_cekregister
      (createdby, updatedby,
      register_distributor_id, 
      id_accounting_distributor,
      reference_nama,
      account_holder,
      bp_role, 
      company_code,
      payment_history_record, 
      planning_group, 
      bank_country, 
      bank_key, 
      account,
      iban, 
      identification_number_zbenst_id,
      identification_number_zbenty_id,
      identification_number_zcharg_id,
      identification_number_zrgtyp_id,
      identification_type,r_payment_term_id)
      VALUES('${m_user_id}',
      '${m_user_id}', 
      '${register_distributor_id}', 
      '${id_accounting_distributor}',
      '${reference_nama}',
      '${account_holder}',
      '${r_bp_role_id}', 
      '${company_code}', 
      '${payment_history_record}',
      '${planning_group}', 
      '${r_bank_country_id}', 
      '${r_bank_key_id}',
      '${account}', '${iban}', 
      '${identification_number_zbenst_id}',
      '${identification_number_zbenty_id}',
      '${identification_number_zcharg_id}',
      '${identification_number_zrgtyp_id}',
      '${identification_type}',
      '${r_payment_term_id}')`;
      
      
      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }

        return res.success({
          data: result,
          message: "Insert data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  approveLogistik: async function(req, res) {
    const {m_user_id,register_distributor_id,kendaraan} = req.body;

    await DB.poolConnect;
    try {

      const request = DB.pool.request();
      await request.query(`DELETE FROM logistik_cekregister WHERE register_distributor_id = '${register_distributor_id}'`);
      for(let i = 0 ; i < kendaraan.length  ;i++){


        const sql = `INSERT INTO logistik_cekregister
        (createdby, updatedby,register_distributor_id, r_kendaraan_id, islcl)
        VALUES(
          '${m_user_id}','${m_user_id}',
          '${register_distributor_id}', '${kendaraan[i].r_kendaraan_id}',
          '${kendaraan[i].islcl}')`;

        await request.query(sql);

      }


        return res.success({
          message: "Insert data successfully"
        });
    } catch (err) {
      return res.error(err);
    }
  },
  // UPDATE RESOURCE
  update: async function(req, res) {
    const { m_user_id,id,nama} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE register_distributor SET updatedby = '${m_user_id}',
                    nama = '${nama}'
                   WHERE register_distributor_id='${id}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Update data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // DELETE RESOURCE
  delete: async function(req, res) {
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM register_distributor WHERE register_distributor_id='${id}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Delete data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};

