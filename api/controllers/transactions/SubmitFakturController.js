/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const moment = require("moment");
const otpGenerator = require("otp-generator");
const SendEmail = require("../../services/SendEmail");
const Base64 = require("base-64");
const xml2js = require("xml2js");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const soapRequest = require("easy-soap-request");
const dokumentPath = (param2, param3) =>
  path.resolve(sails.config.appPath, "repo", param2, param3);
const direktoricetak = () =>
  path.resolve(sails.config.appPath, "assets", "report", "submitfaktur");
const numeral = require("numeral");
const momentBusinessDays = require("moment-business-days");
const { log } = require("console");

const re = /(?:\.([^.]+))?$/;
const getExtOnly = (str, adddot = true) => {
  const result = re.exec(str)[1];
  if (result) return adddot ? "." + result : result;
  return "";
};

module.exports = {
  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: {
        currentPage,
        pageSize,
        m_user_id,
        periode,
        m_distributor_id,
        status,
        searchText,
        filter,
      },
    } = req;

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";

      let sqlGetRoles = `SELECT * FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
      let dataroles = await request.query(sqlGetRoles);
      let datarole = dataroles.recordset[0];
      let rolename = datarole.nama;

      let WherePeriode = ``;
      if (periode) {
        let bulan = parseInt(moment(periode, "YYYY-MM").format("MM"));
        let tahun = parseInt(moment(periode, "YYYY-MM").format("YYYY"));

        WherePeriode = `AND ci.bulan = ${bulan} AND ci.tahun = ${tahun}`;
      }

      let whereClauseSearch = ``;
      if (searchText) {
        whereClauseSearch = `AND ci.documentno LIKE '%${searchText}%'
            OR ci.nomor_invoice LIKE '%${searchText}%'`;
      }

      let WhereShipto = ``;
      if (m_distributor_id) {
        //WhereShipto = `AND ci.m_distributor_id = '${m_distributor_id}'`;
        WhereShipto = ``;
      }

      let WhereStatus = ``;
      if (status) {
        WhereStatus = `AND ci.kode_status= '${status}'`;
      }

      let org = `SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE isactive='Y' AND m_user_id = '${m_user_id}'`;
      let orgs = await request.query(org);
      let organization = orgs.recordset.map(function (item) {
        return item["r_organisasi_id"];
      });

      let valueIN = "";
      let listOrg = "";
      for (const datas of organization) {
        valueIN += ",'" + datas + "'";
      }

      valueIN = valueIN.substring(1);

      listOrg =
        organization.length > 0 && req.query.filter === undefined
          ? `AND r_organisasi_id IN (${valueIN})`
          : "";

      let wheretransporter = "";
      if (req.query.transporter) {
        wheretransporter = ` and m_transporter_id = '${req.query.transporter}' `;
      }

      let whereClauseStatusRoles = ``;
      if (rolename == "LOGISTIKHEAD") {
        whereClauseStatusRoles = `AND ci.kode_status IN ('DR','APL','RJL','APLH','RJLH','APLHF','RJLHF','WT1','WT2','WT3','WT4')`;
        listOrg = ``;
      } else if (rolename == "LOGISTIK") {
        whereClauseStatusRoles = `AND ci.kode_status IN ('DR','APL','RJL','APLH','RJLH','APLHF','RJLHF','WT1','WT2','WT3','WT4')`;
        listOrg = ``;
      } else if (rolename == "LOGISTIKFINANCE") {
        whereClauseStatusRoles = `AND ci.kode_status IN ('DR','APL','RJL','APLH','RJLH','APLHF','RJLHF','WT1','WT2','WT3','WT4')`;
        listOrg = ``;
      } else if (rolename == "ACCOUNTING2") {
        whereClauseStatusRoles = `AND ci.kode_status IN ('DR','APL','RJL','APLH','RJLH','APLHF','RJLHF','WT1','WT2','WT3','WT4')`;
        listOrg = ``;
      }

      let queryCountTable = `SELECT
        COUNT(1) AS total_rows FROM c_invoice_v ci
        WHERE ci.isactive='Y' ${whereClause} ${listOrg} ${whereClauseStatusRoles} ${whereClauseSearch} ${WherePeriode} ${WhereStatus} ${WhereShipto} ${wheretransporter}`;

      let queryDataTable = `SELECT
        c_invoice_id, isactive, created, createdby, updated, updatedby, m_transporter_id, nomor_invoice, tanggal_invoice, bulan, 
        tahun, nominal_invoice_sebelum_ppn, dasar_pengenaan_pajak, ppn, nominal_ppn, npwp, file_nota_pengiriman_barang, file_add_cost,
        nomor_rekening, nomor_surat_keterangan_bebas_pajak, file_surat_keterangan_bebas_pajak, nomor_faktur, file_faktur_pajak, 
        tanggal_faktur, file_invoice, tipe_pajak, tanggal_surat_jalan, nomor_surat_jalan, nomor_po, file_po, 
        nominal_invoice_sesudah_ppn, keterangan_ppn, status, kode_status, reason, pengurang_invoice, 
        file_dokumen_pengecekan, date_approve_logistik, date_approve_logistik_head, r_organisasi_id, kode, nama, 
        kubikasi, documentno, nomor_resi, perusahaan_kurir, nomor_sap, fiscal_year, r_pajak_id, r_partner_bank_key_id, 
        r_house_bank, base_line_date, payment_term, posting_date, jumlah_pph, perihal_klaim, nama_pph, tipe_pph, percentage_pph, 
        kode_pph, bank_country, bank_key, bank_account, part_bank_key, reference_details, account_holder, house_bank, nama_payment_term, 
        nominal_pajak, base_pph, plan_payment_date,
        CASE WHEN base_line_date IS NOT NULL THEN CONVERT(VARCHAR(12),DATEADD(day, plan_payment_date, base_line_date),120) ELSE '-' END estimated_date,
        payment_no,
        CONVERT(VARCHAR(12),tgl_bayar,120) AS tgl_bayar 
        FROM c_invoice_v ci
        WHERE ci.isactive='Y' ${whereClause} ${listOrg} ${whereClauseStatusRoles} ${whereClauseSearch} ${WherePeriode} ${WhereStatus} ${WhereShipto} ${wheretransporter}
        ORDER BY ci.created DESC
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY`;

      console.log('liat qiery',queryDataTable);

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;
      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        for (let i = 0; i < rows.length; i++) {
          let c_invoice_id = rows[i].c_invoice_id;
          let getdatainvoicedetail =
            await request.query(`SELECT * FROM c_invoice_detail WHERE c_invoice_id = '${c_invoice_id}' 
                ORDER BY bundle_id`);
          let datainvoicedetail = getdatainvoicedetail.recordset;
          // console.log(getdatainvoicedetail);

          rows[i].lines = datainvoicedetail;

          let getbiayalain = await request.query(
            `SELECT * FROM c_invoice_biaya_lain WHERE c_invoice_id = '${c_invoice_id}' ORDER BY created`
          );
          let databiayalain = getbiayalain.recordset;
          rows[i].biaya_lain = databiayalain;

          // for (let j = 0; j < rows[i].biaya_lain.length; j++) {

          //     rows[i].biaya_lain[j].kode_detail_ppn = 'V0';

          // }
          // console.log(rows[i].biaya_lain);

          let queryDataTable = `SELECT TOP 1 DATEDIFF(second, created , GETDATE()) AS difference,
                CONVERT(VARCHAR(12),created,120) AS lastactiondate
                FROM audit_submit_faktur 
                WHERE c_invoice_id = '${c_invoice_id}' 
                ORDER BY created DESC`;

          let getDataDifference = await request.query(queryDataTable);
          let lastactiondate =
            getDataDifference.recordset.length > 0
              ? moment(
                  getDataDifference.recordset[0].lastactiondate,
                  "YYYY-MM-DD"
                ).format("YYYY-MM-DD")
              : null;

          let leadtime = `-`;
          if (lastactiondate) {
            let data = momentBusinessDays(
              lastactiondate,
              "YYYY-MM-DD"
            ).businessAdd(3)._d;
            leadtime = moment(data).format("YYYY-MM-DD");
          }

          let timeAllert = false;

          if (moment() > moment(leadtime, "YYYY-MM-DD")) {
            timeAllert = true;
          }

          if (rows[i].estimated_date == "-") {
            rows[i].leadTime = leadtime;
          } else {
            rows[i].leadTime = "-";
          }

          rows[i].lastAction = lastactiondate;
          rows[i].timeAllert = timeAllert;
        }

        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // GET ONE RESOURCE
  findOne: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      console.log("ambil ini");

      let queryDataTable = `SELECT 
            ci.c_invoice_id, ci.isactive, ci.created, ci.createdby, ci.updated, ci.updatedby, 
            ci.m_transporter_id, ci.nomor_invoice, ci.tanggal_invoice, 
            ci.dasar_pengenaan_pajak AS nominal_invoice_sebelum_ppn,
            ci.dasar_pengenaan_pajak,ci.ppn,
            ci.nominal_pajak AS nominal_ppn, 
            ci.npwp, ci.file_nota_pengiriman_barang, 
            ci.nomor_rekening, 
            ci.nomor_surat_keterangan_bebas_pajak, 
            ci.file_surat_keterangan_bebas_pajak, 
            ci.nomor_faktur,ci.file_faktur_pajak, 
            CASE WHEN ci.ppn > 0 THEN 'PKP' ELSE 'NON PKP' END tipe_pajak,
            ci.tanggal_faktur, ci.file_invoice, ci.tanggal_surat_jalan, 
            ci.nomor_surat_jalan, ci.nomor_po,ci.nomor_gr, ci.file_po, 
            ci.nominal_invoice_sesudah_ppn, ci.keterangan_ppn, ci.status, ci.kode_status,
            ci.reason,ci.potongan_invoice AS pengurang_invoice,ci.file_dokumen_pengecekan,
            mtv.r_organisasi_id,mtv.kode,mtv.nama,ci.kubikasi,ci.documentno,
            ci.payment_no,
            ci.tgl_bayar
            FROM c_invoice ci LEFT JOIN 
            m_transporter_v mtv ON(mtv.m_transporter_id = ci.m_transporter_id)
            WHERE ci.isactive='Y' AND ci.c_invoice_id='${req.param("id")}'`;

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        let getdatainvoicedetail = await request.query(
          `SELECT * FROM c_invoice_detail_v WHERE c_invoice_id = '${row.c_invoice_id}' ORDER BY bundle_id,nomor_do`
        );
        let datainvoicedetail = getdatainvoicedetail.recordset;
        row.lines = datainvoicedetail;

        let getbiayalain = await request.query(
          `SELECT * FROM c_invoice_biaya_lain WHERE c_invoice_id = '${row.c_invoice_id}' ORDER BY created`
        );
        let databiayalain = getbiayalain.recordset;
        row.biaya_lain = databiayalain;

        return res.success({
          result: row,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  findHistory: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      const id = req.param("id");

      let queryDataTable = ` SELECT mu.nama,asf.status,CONVERT(VARCHAR(16),asf.created,120) AS tgl_action,asf.created,
        COALESCE(mu.nik,mu.username) AS nip,asf.reason_reject,
        COALESCE(DATEDIFF(second,
          (SELECT TOP 1 created FROM audit_submit_faktur WHERE c_invoice_id = asf.c_invoice_id AND created < asf.created ORDER BY created DESC),
          asf.created
          ),0) AS difference
        FROM audit_submit_faktur asf,m_user mu WHERE 
        asf.c_invoice_id = '${id}'
        AND asf.m_user_id = mu.m_user_id 
        ORDER BY asf.created`;

      // console.log(queryDataTable);

      let result = await request.query(queryDataTable);
      const rows = result.recordset;

      for (let i = 0; i < rows.length; i++) {
        const difference = rows[i].difference;
        let hasil = GetTimeDiff(difference);
        rows[i].serviceLevel = hasil;
      }

      return res.success({
        result: rows,
        message: "Fetch data successfully",
      });
    } catch (err) {
      return res.error(err);
    }
  },
  getServiceLevel: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      const id = req.param("id");

      let queryDataTable = `SELECT TOP 1 DATEDIFF(second, created , GETDATE()) AS difference,
        CONVERT(VARCHAR(12),created,120) AS lastactiondate
        FROM audit_submit_faktur 
        WHERE c_invoice_id = '${id}' 
        ORDER BY created DESC`;

      let getDataDifference = await request.query(queryDataTable);
      let difference =
        getDataDifference.recordset.length > 0
          ? getDataDifference.recordset[0].difference
          : 0;
      let lastactiondate =
        getDataDifference.recordset.length > 0
          ? moment(
              getDataDifference.recordset[0].lastactiondate,
              "YYYY-MM-DD"
            ).format("YYYY-MM-DD")
          : null;

      console.log("lastactiondate ", lastactiondate);
      console.log("difference ", difference);

      let leadtime = `-`;
      if (lastactiondate) {
        let data = momentBusinessDays(lastactiondate, "YYYY-MM-DD").businessAdd(
          3
        )._d;
        leadtime = moment(data).format("YYYY-MM-DD");
        console.log("leadtime ", leadtime);
      }

      let timeAllert = false;

      if (moment() > moment(leadtime, "YYYY-MM-DD")) {
        timeAllert = true;
      }

      let hasil = GetTimeDiff(difference);

      let obj = {
        lastAction: lastactiondate,
        leadTime: leadtime,
        timeAllert: timeAllert,
        serviceLevel: hasil,
      };

      return res.success({
        result: obj,
        message: "Fetch data successfully",
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // CREATE NEW RESOURCE
  new: async function (req, res) {
    const {
      m_user_id,
      nomor_invoice,
      tanggal_invoice,
      dasar_pengenaan_pajak,
      nominal_pajak,
      npwp,
      file_nota_pengiriman_barang,
      nomor_rekening,
      nomor_surat_keterangan_bebas_pajak,
      file_surat_keterangan_bebas_pajak,
      file_faktur_pajak,
      tanggal_faktur,
      file_invoice,
      tanggal_surat_jalan,
      nomor_surat_jalan,
      nominal_invoice_sesudah_ppn,
      keterangan_ppn,
      nomor_faktur,
      ppn,
      lines,
      biaya_lain,
      kubikasi,
      file_add_cost,
    } = JSON.parse(req.body.document);

    let kode_ppn = "V0";

    if (ppn == 0) {
      kode_ppn = "V0";
    } else if (ppn == 10) {
      kode_ppn = "V1";
    } else if (ppn == 1) {
      kode_ppn = "V2";
    } else if (ppn == 11) {
      kode_ppn = "V3";
    } else if (ppn == 1.1) {
      kode_ppn = "V4";
    }

    await DB.poolConnect;
    const request = DB.pool.request();

    let sqltransporter = `SELECT * FROM m_transporter_v mtv WHERE m_user_id='${m_user_id}'`;
    let getdatatransporter = await request.query(sqltransporter);
    let datatransporter =
      getdatatransporter.recordset.length > 0
        ? getdatatransporter.recordset[0]
        : undefined;

    let m_transporter_id = ``;
    let kode_transporter = ``;
    if (datatransporter) {
      m_transporter_id = datatransporter.m_transporter_id;
      kode_transporter = datatransporter.kode;
    }

    // console.log("biaya lain",biaya_lain);
    // PROSES VALIDASI
    let errorValidation = [];
    if (nomor_invoice.length > 16) {
      errorValidation.push("Nomor Invoice maksimal 16 karakter");
    }

    if (nomor_faktur.length > 25) {
      errorValidation.push("Nomor Faktur maksimal 25 karakter");
    }

    var id_faktur = uuid();
    const generatedID = id_faktur.toUpperCase();
    var uploadFile = req.file("file");
    uploadFile.upload(
      { maxBytes: 500000000000 },
      async function onUploadComplete(err, files) {
        if (err) {
          let errMsg = err.message;
          return res.error(errMsg);
        }

        for (const file of files) {
          console.log("filename", file.filename);
          // ..disini move ke tempat semestinya
          fs.mkdirSync(dokumentPath("submitfaktur", generatedID), {
            recursive: true,
          });
          const filesamaDir = glob.GlobSync(
            path.resolve(
              dokumentPath("submitfaktur", generatedID),
              file.filename.replace(/\.[^/.]+$/, "")
            ) + "*"
          );
          if (filesamaDir.found.length > 0) {
            console.log("isexist file nama sama", filesamaDir.found[0]);
            fs.unlinkSync(filesamaDir.found[0]);
          }
          fs.renameSync(
            file.fd,
            path.resolve(
              dokumentPath("submitfaktur", generatedID),
              file.filename
            )
          );
        }
        //kode insert ke db
        try {
          if (errorValidation.length > 0) {
            let pesan = ``;
            for (let i = 0; i < errorValidation.length; i++) {
              let text = errorValidation[i];
              pesan = pesan + `${i + 1}. ${text} <br>`;
            }

            return res.error({
              message: pesan,
            });
          }

          let status = `Pengajuan`;
          let kode_status = `DR`;

          let fieldnomorfaktur = nomor_faktur ? `'${nomor_faktur}'` : "NULL";
          let fieldnpwp = npwp ? `'${npwp}'` : "NULL";

          let fieldnomor_surat_keterangan_bebas_pajak =
            nomor_surat_keterangan_bebas_pajak
              ? `'${nomor_surat_keterangan_bebas_pajak}'`
              : "NULL";
          let tipeppn = ppn > 0 ? "PKP" : "NON PKP";

          let fieldfile_surat_keterangan_bebas_pajak =
            file_surat_keterangan_bebas_pajak
              ? `'${file_surat_keterangan_bebas_pajak}'`
              : "NULL";

          let tahun = moment().format("YYYY");
          let bulan = moment().format("MMM").toUpperCase();

          let sqlGetDataTransporter = `SELECT * FROM m_transporter_v WHERE m_transporter_id = '${m_transporter_id}'`;
          let getDataTransporter = await request.query(sqlGetDataTransporter);
          let kodeTransporter =
            getDataTransporter.recordset.length > 0
              ? getDataTransporter.recordset[0].kode
              : undefined;

          let getsequenceNumber = `SELECT seq + 1 AS seq FROM c_invoice_document_sequence ci 
                    WHERE kode = '${kodeTransporter}'`;

          let getdataSequenceNumber = await request.query(getsequenceNumber);
          let dataSeq =
            getdataSequenceNumber.recordset.length > 0
              ? getdataSequenceNumber.recordset[0].seq
              : 1;
          let nomorUrut = pad(dataSeq);

          // let documentno = otpGenerator.generate(6, { upperCase: false, specialChars: false,alphabets:false });
          let documentno = tahun
            .concat("/")
            .concat(bulan)
            .concat("/")
            .concat(kodeTransporter)
            .concat("/")
            .concat(nomorUrut);

          const sql = `INSERT INTO c_invoice
                    (
                    c_invoice_id,
                    createdby, 
                    updatedby,
                    m_transporter_id,
                    nomor_invoice, 
                    tanggal_invoice, 
                    dasar_pengenaan_pajak, 
                    npwp, 
                    file_nota_pengiriman_barang,
                    file_add_cost,
                    nomor_rekening, 
                    nomor_surat_keterangan_bebas_pajak, 
                    file_surat_keterangan_bebas_pajak, 
                    file_faktur_pajak, 
                    tanggal_faktur, 
                    file_invoice, 
                    tanggal_surat_jalan, 
                    nomor_surat_jalan, 
                    nominal_invoice_sesudah_ppn, 
                    keterangan_ppn, 
                    status, 
                    kode_status,
                    nomor_faktur,
                    ppn,
                    nominal_pajak,
                    kubikasi,
                    documentno,
                    ppn_value,
                    kode_ppn
                    )
                  VALUES (
                    '${generatedID}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${m_transporter_id}',
                    '${nomor_invoice}',
                    '${tanggal_invoice}',
                    '${dasar_pengenaan_pajak}',
                    ${fieldnpwp},
                    '${file_nota_pengiriman_barang}',
                    '${file_add_cost}',
                    '${nomor_rekening}',
                    ${fieldnomor_surat_keterangan_bebas_pajak},
                    ${fieldfile_surat_keterangan_bebas_pajak},
                    '${file_faktur_pajak}',
                    '${tanggal_faktur}',
                    '${file_invoice}',
                    '${tanggal_surat_jalan}',
                    '${nomor_surat_jalan}',
                    '${nominal_invoice_sesudah_ppn}',
                    '${tipeppn}',
                    '${status}',
                    '${kode_status}',
                    ${fieldnomorfaktur},
                    ${ppn},
                    ${nominal_pajak},
                    ${kubikasi},
                    '${documentno}',
                    ${ppn},
                    '${kode_ppn}'
                  )`;

          console.log(sql);

          request.query(sql, async (err) => {
            if (err) {
              return res.error(err);
            }

            if (dataSeq == 1) {
              let insertSequence = `INSERT INTO c_invoice_document_sequence
                          (c_invoice_document_sequence_id, isactive, created, createdby, updated, updatedby, kode, seq)
                          VALUES(newid(), 'Y', getdate(), '${m_user_id}', getdate(), '${m_user_id}', '${kodeTransporter}', 1)`;

              await request.query(insertSequence);
            } else {
              let updateSequence = `UPDATE c_invoice_document_sequence SET seq = seq + 1 WHERE kode = '${kodeTransporter}'`;
              await request.query(updateSequence);
            }

            // AUDIT DATA

            let insertAudit = `INSERT INTO audit_submit_faktur
                        (c_invoice_id, m_user_id, status, reason_reject,kode_status)
                        VALUES('${generatedID}', '${m_user_id}', 'Pengajuan', NULL,'${kode_status}')`;

            await request.query(insertAudit);

            for (let i = 0; i < lines.length; i++) {
              let bundle_id =
                lines[i].nomor_id && lines[i].nomor_id != ""
                  ? `'${lines[i].nomor_id}'`
                  : "NULL";
              let tahun =
                lines[i].tahun && lines[i].tahun != ""
                  ? `${lines[i].tahun}`
                  : "NULL";
              let nomor_po =
                lines[i].nomor_po && lines[i].nomor_po != ""
                  ? `'${lines[i].nomor_po}'`
                  : "NULL";
              let nomor_gr =
                lines[i].nomor_gr && lines[i].nomor_gr != ""
                  ? `'${lines[i].nomor_gr}'`
                  : "NULL";
              let item_additional_cost =
                lines[i].item_additional_cost &&
                lines[i].item_additional_cost != ""
                  ? `'${lines[i].item_additional_cost}'`
                  : "NULL";
              let item_cost_shipment =
                lines[i].item_cost_shipment && lines[i].item_cost_shipment != ""
                  ? `'${lines[i].item_cost_shipment}'`
                  : "NULL";
              let nomor_gr_additional_cost =
                lines[i].nomor_gr_additional_cost &&
                lines[i].nomor_gr_additional_cost != ""
                  ? `'${lines[i].nomor_gr_additional_cost}'`
                  : "NULL";
              let cost_shipment =
                lines[i].cost_shipment && lines[i].cost_shipment != ""
                  ? lines[i].cost_shipment
                  : 0;
              let additional_cost =
                lines[i].additional_cost && lines[i].additional_cost != ""
                  ? lines[i].additional_cost
                  : 0;
              let delivery_order_id =
                lines[i].delivery_order_id && lines[i].delivery_order_id != ""
                  ? `'${lines[i].delivery_order_id}'`
                  : "NULL";
              let tanggal_pod_transporter =
                lines[i].tanggal_pod_transporter &&
                lines[i].tanggal_pod_transporter != ""
                  ? `'${lines[i].tanggal_pod_transporter}'`
                  : "NULL";
              let kode_kendaraan =
                lines[i].kode_kendaraan && lines[i].kode_kendaraan != ""
                  ? `'${lines[i].kode_kendaraan}'`
                  : "NULL";
              let jenis_kendaraan =
                lines[i].jenis_kendaraan && lines[i].jenis_kendaraan != ""
                  ? `'${lines[i].jenis_kendaraan}'`
                  : "NULL";
              let total =
                lines[i].total && lines[i].total != "" ? lines[i].total : 0;

              let queryInsertLines = `INSERT INTO c_invoice_detail
                          (createdby, updatedby, c_invoice_id, delivery_order_id,bundle_id,tahun,nomor_po,nomor_gr,item_additional_cost,
                          item_cost_shipment,nomor_gr_additional_cost,cost_shipment,additional_cost,tanggal_pod_transporter,nomor_id,kode_kendaraan,jenis_kendaraan,total)
                          VALUES('${m_user_id}','${m_user_id}', '${generatedID}',${delivery_order_id},${bundle_id},${tahun},${nomor_po},${nomor_gr},
                          ${item_additional_cost},${item_cost_shipment},${nomor_gr_additional_cost},${cost_shipment},${additional_cost},
                          ${tanggal_pod_transporter},${bundle_id},${kode_kendaraan},${jenis_kendaraan},${total})`;
              console.log(queryInsertLines);
              await request.query(queryInsertLines);
            }

            let sqlgetdocumentno = `SELECT document_number_id FROM document_number WHERE kode = 'SUBMITFAKTUR'`;
            let getdocument = await request.query(sqlgetdocumentno);
            let document_number_id =
              getdocument.recordset.length > 0
                ? getdocument.recordset[0].document_number_id
                : "";
            let sqlgetOrg = `SELECT * FROM m_transporter_v WHERE m_transporter_id = '${m_transporter_id}'`;
            let getorg = await request.query(sqlgetOrg);

            let r_organisasi_id = getorg.recordset[0].r_organisasi_id;
            let queryGetDocument = `
                        SELECT COUNT(1) + 1 AS totalrows FROM document_number dn,document_number_line dnl 
                        WHERE dn.document_number_id= '${document_number_id}'
                        AND dn.document_number_id = dnl.document_number_id
                        AND dnl.r_organisasi_id = '${r_organisasi_id}'`;

            let getsequence = await request.query(queryGetDocument);
            const row = getsequence.recordset[0];
            let linenumber = parseInt(row.totalrows);

            let insertDocumentNo = `INSERT INTO document_number_line
                        (document_number_id, r_organisasi_id, line)
                        VALUES('${document_number_id}','${r_organisasi_id}',${linenumber})`;

            await request.query(insertDocumentNo);

            let queryDataTable = `SELECT 
                        ci.c_invoice_id, ci.isactive, ci.created, ci.createdby, ci.updated, ci.updatedby, 
                        ci.m_transporter_id, ci.nomor_invoice, ci.tanggal_invoice, 
                        ci.dasar_pengenaan_pajak AS nominal_invoice_sebelum_ppn,
                        ci.dasar_pengenaan_pajak,ci.ppn,
                        ci.dasar_pengenaan_pajak * ci.ppn / 100 AS nominal_ppn, 
                        ci.npwp, ci.file_nota_pengiriman_barang, ci.file_add_cost,
                        ci.nomor_rekening, ci.nomor_surat_keterangan_bebas_pajak, ci.file_surat_keterangan_bebas_pajak, ci.nomor_faktur,ci.file_faktur_pajak, 
                        ci.tanggal_faktur, ci.file_invoice, ci.tanggal_surat_jalan, ci.nomor_surat_jalan, ci.nomor_po,ci.nomor_gr, ci.file_po, 
                        ci.nominal_invoice_sesudah_ppn, ci.keterangan_ppn, ci.status, ci.kode_status,ci.reason,
                        ci.potongan_invoice AS pengurang_invoice,ci.file_dokumen_pengecekan,
                        mtv.r_organisasi_id,mtv.kode,mtv.nama,ci.documentno,ci.date_approve_logistik_head,ci.date_approve_logistik
                        FROM c_invoice ci LEFT JOIN 
                        m_transporter_v mtv ON(mtv.m_transporter_id = ci.m_transporter_id)
                        WHERE ci.isactive='Y' AND ci.c_invoice_id='${generatedID}'`;

            let sqlDataTableDetail = `SELECT *
                        FROM c_invoice_detail 
                        WHERE c_invoice_detail.c_invoice_id = '${generatedID}'`;

            // console.log(sqlDataTableDetail);
            // console.log("biaya lain",biaya_lain);
            if (biaya_lain) {
              let total_biaya_lain = 0;
              biaya_lain.map((item) => {
                let dataKodeItem =
                  item.kode_item && item.kode_item !== "undefined"
                    ? `'${item.kode_item}'`
                    : "NULL";
                let kodeDetailPpn = item.kode_detail_ppn;

                let sqlFakturBiayaLain = `INSERT INTO c_invoice_biaya_lain ( createdby, updatedby,c_invoice_id, keterangan, nominal,nomor_id,
                                nomor_gr,fiscal_year,kode_material,kode_item,nomor_po,kode_detail_ppn) 
                                VALUES ('${m_user_id}','${m_user_id}','${generatedID}','${item.keterangan}','${item.nominal}',
                                '${item.nomor_id}','${item.nomor_gr}','${item.fiscal_year}','${item.kode_material}',${dataKodeItem},'${item.nomor_po}','${kodeDetailPpn}')`;
                console.log(sqlFakturBiayaLain);
                total_biaya_lain = total_biaya_lain + Number(item.nominal);

                request.query(sqlFakturBiayaLain, (err, result) => {
                  if (err) {
                    return res.error(err);
                  }
                });
              });

              let updateTotalBiayaLain = `UPDATE c_invoice SET biaya_lain='${total_biaya_lain}' WHERE c_invoice_id = '${generatedID}'`;
              await request.query(updateTotalBiayaLain);
            }

            let data_faktur = await request.query(queryDataTable);
            let faktur = data_faktur.recordset[0];

            let data_fakturdetail = await request.query(sqlDataTableDetail);
            let fakturdetail = data_fakturdetail.recordset;
            faktur.lines = fakturdetail;

            let bundle_id = [];
            let nomor_do = [];
            let nomor_po = [];
            for (let i = 0; i < fakturdetail.length; i++) {
              bundle_id.push(fakturdetail[i].bundle_id);
              nomor_do.push(fakturdetail[i].nomor_do);
              nomor_po.push(fakturdetail[i].nomor_po);
            }

            let databundle = _.uniq(bundle_id);
            let datado = _.uniq(nomor_do);
            let dataPo = _.uniq(nomor_po);

            let getdataemail = await request.query(`
                        SELECT * FROM email_logistik WHERE isactive = 'Y' AND ishead='N'`);

            let dataemail = [];
            if (getdataemail.recordset.length > 0) {
              for (let i = 0; i < getdataemail.recordset.length; i++) {
                dataemail.push(getdataemail.recordset[i].email_verifikasi);
              }
            }

            if (dataemail.length > 0) {
              const param = {
                subject: "Submit Faktur Transporter",
                transporter: faktur.nama,
                nomor_invoice: nomor_invoice,
                nomor_dokumen: documentno,
                tanggal_invoice: tanggal_invoice,
                databundle: databundle.toString(),
                nomor_surat_jalan: datado.toString(),
                nomor_po: nomor_po.toString(),
                nominal_invoice: `Rp. ${nominal_invoice_sesudah_ppn}`,
              };

              const template = await sails.helpers.generateHtmlEmail.with({
                htmltemplate: "submitfaktur",
                templateparam: param,
              });
              SendEmail(dataemail.toString(), param.subject, template);
            }

            return res.success({
              data: faktur,
              message: "Insert data successfully",
            });
          });
        } catch (err) {
          return res.error(err);
        }
      }
    );
  },

  // UPDATE RESOURCE
  update: async function (req, res) {
    // console.log('req.body', req.body)
    const {
      c_invoice_id,
      m_user_id,
      m_transporter_id,
      nomor_invoice,
      tanggal_invoice,
      dasar_pengenaan_pajak,
      nominal_pajak,
      npwp,
      file_nota_pengiriman_barang,
      nomor_rekening,
      nomor_surat_keterangan_bebas_pajak,
      file_surat_keterangan_bebas_pajak,
      file_faktur_pajak,
      tanggal_faktur,
      file_invoice,
      tanggal_surat_jalan,
      nomor_surat_jalan,
      nomor_po,
      nomor_gr,
      file_po,
      nominal_invoice_sesudah_ppn,
      keterangan_ppn,
      nomor_faktur,
      kubikasi,
      biaya_lain,
      nomor_resi,
      perusahaan_kurir,
      file_add_cost,
    } = JSON.parse(req.body.document);

    console.log(biaya_lain);

    var uploadFile = req.file("file");
    uploadFile.upload(
      { maxBytes: 500000000000 },
      async function onUploadComplete(err, files) {
        if (err) {
          let errMsg = err.message;
          return res.error(errMsg);
        }

        for (const file of files) {
          console.log("filename", file.filename);
          // ..disini move ke tempat semestinya
          fs.mkdirSync(dokumentPath("submitfaktur", c_invoice_id), {
            recursive: true,
          });
          const filesamaDir = glob.GlobSync(
            path.resolve(
              dokumentPath("submitfaktur", c_invoice_id),
              file.filename.replace(/\.[^/.]+$/, "")
            ) + "*"
          );
          if (filesamaDir.found.length > 0) {
            console.log("isexist file nama sama", filesamaDir.found[0]);
            fs.unlinkSync(filesamaDir.found[0]);
          }
          fs.renameSync(
            file.fd,
            path.resolve(
              dokumentPath("submitfaktur", c_invoice_id),
              file.filename
            )
          );
        }
        //kode insert ke db
        let nomor_gr_text =
          nomor_gr && nomor_gr != "null" ? `'${nomor_gr}'` : "NULL";
        let nomor_po_text =
          nomor_po && nomor_po != "null" ? `'${nomor_po}'` : "NULL";
        let file_po_text =
          file_po && file_po != "null" ? `'${file_po}'` : "NULL";
        let file_surat_keterangan_bebas_pajak_text =
          file_surat_keterangan_bebas_pajak &&
          file_surat_keterangan_bebas_pajak != "null"
            ? `'${file_surat_keterangan_bebas_pajak}'`
            : "NULL";
        let file_faktur_pajak_text =
          file_faktur_pajak && file_faktur_pajak != "null"
            ? `'${file_faktur_pajak}'`
            : "NULL";
        let file_nota_pengiriman_barang_text =
          file_nota_pengiriman_barang && file_nota_pengiriman_barang != "null"
            ? `'${file_nota_pengiriman_barang}'`
            : "NULL";
        let file_invoice_text =
          file_invoice && file_invoice != "null" ? `'${file_invoice}'` : "NULL";
        let nomor_resi_text = nomor_resi ? `'${nomor_resi}'` : "NULL";
        let kurir_text = perusahaan_kurir ? `'${perusahaan_kurir}'` : "NULL";
        let nomor_surat_keterangan_bebas_pajak_text =
          nomor_surat_keterangan_bebas_pajak
            ? `'${nomor_surat_keterangan_bebas_pajak}'`
            : "NULL";
        let file_add_cost_text =
          file_add_cost && file_add_cost != "null"
            ? `'${file_add_cost}'`
            : "NULL";

        await DB.poolConnect;
        try {
          const request = DB.pool.request();

          for (let i = 0; i < biaya_lain.length; i++) {
            let c_invoice_biaya_lain_id = biaya_lain[i].c_invoice_biaya_lain_id;
            let kode_detail_ppn = biaya_lain[i].kode_detail_ppn;

            let sqlUpdateDetailPpn = `UPDATE c_invoice_biaya_lain SET kode_detail_ppn='${kode_detail_ppn}' 
                    WHERE c_invoice_biaya_lain_id = '${c_invoice_biaya_lain_id}'`;
            await request.query(sqlUpdateDetailPpn);
          }

          const sql = `UPDATE c_invoice SET
                    updated=getdate(),
                    kode_status='DR',
                    status='Pengajuan',
                    updatedby='${m_user_id}', 
                    m_transporter_id='${m_transporter_id}', 
                    nomor_invoice='${nomor_invoice}', 
                    tanggal_invoice='${tanggal_invoice}', 
                    dasar_pengenaan_pajak=${dasar_pengenaan_pajak}, 
                    nominal_pajak=${nominal_pajak}, 
                    npwp='${npwp}', 
                    nomor_rekening='${nomor_rekening}', 
                    nomor_surat_keterangan_bebas_pajak=${nomor_surat_keterangan_bebas_pajak_text},
                    file_nota_pengiriman_barang=${file_nota_pengiriman_barang_text},  
                    file_surat_keterangan_bebas_pajak=${file_surat_keterangan_bebas_pajak_text}, 
                    file_faktur_pajak=${file_faktur_pajak_text}, 
                    file_po=${file_po_text}, 
                    file_invoice=${file_invoice_text}, 
                    tanggal_faktur='${tanggal_faktur}', 
                    tanggal_surat_jalan='${tanggal_surat_jalan}', 
                    nomor_surat_jalan='${nomor_surat_jalan}', 
                    nomor_po=${nomor_gr_text}, 
                    nomor_gr=${nomor_po_text}, 
                    nominal_invoice_sesudah_ppn=${nominal_invoice_sesudah_ppn}, 
                    keterangan_ppn='${keterangan_ppn}',
                    nomor_faktur='${nomor_faktur}',
                    kubikasi=${kubikasi},
                    nomor_resi = ${nomor_resi_text},
                    perusahaan_kurir = ${kurir_text},
                    file_add_cost = ${file_add_cost_text}
                    WHERE c_invoice_id ='${c_invoice_id}'`;
          await request.query(sql);

          let insertAudit = `INSERT INTO audit_submit_faktur
                    (c_invoice_id, m_user_id, status, reason_reject,kode_status)
                    VALUES('${c_invoice_id}', '${m_user_id}', 'Edit Pengajuan', NULL,'DR')`;

          await request.query(insertAudit);

          return res.success({
            message: "Update data successfully",
          });
        } catch (err) {
          return res.error(err);
        }
      }
    );
  },

  approveNpb: async function (req, res) {
    const {
      m_user_id,
      c_invoice_id,
      nomor_po,
      nomor_gr,
      file_po,
      pengurang_invoice,
      file_dokumen_pengecekan,
      details,
      nomor_resi,
      perusahaan_kurir,
      company_code,
      payment_term,
      r_pajak_id,
      base_line_date,
      r_partner_bank_key_id,
      r_house_bank,
      perihal_klaim,
      kode_ppn,
      nominal_pajak,
      dasar_pengenaan_pajak,
      jumlah_pph,
      tipe_pph,
      kode_pph,
      posting_date,
      base_pph,
      biaya_lainnya,
    } = req.body;
    await DB.poolConnect;
    const request = DB.pool.request();
    console.log(req.body);

    // PROSES AMBIL KONDISI DATA INVOICE TERUPDATE
    let sqlGetDataInvoice = `SELECT kode_status,convert(varchar(10),
    tanggal_invoice,120) AS tanggal_invoice,nomor_invoice,
    nominal_invoice_sesudah_ppn,
    nomor_faktur,
    biaya_lain AS nominal_invoice_sebelum_ppn,
    mtv.nama AS nama_transporter
    FROM c_invoice ci LEFT JOIN m_transporter_v mtv ON mtv.m_transporter_id = ci.m_transporter_id WHERE ci.c_invoice_id = '${c_invoice_id}'`;

    console.log(sqlGetDataInvoice,"cek data invoice");

    let getDataInvoice = await request.query(sqlGetDataInvoice);
    let dataInvoice = getDataInvoice.recordset[0];
    let kode_status = dataInvoice.kode_status;

    let jumlahPph = jumlah_pph ? jumlah_pph : 0;
    let jumlahHasilPph = Math.round(jumlahPph);

    // PROSES UPDATE KODE DETAIL PPN
    let taxAmount = 0;
    let taxBaseAmount = 0;
    let jumlahJenisPajak = 0;

    if (kode_status == "WT3") {
      let detailBiayaLain = biaya_lainnya
        ? JSON.parse(biaya_lainnya)
        : JSON.parse(details);
      console.log('detailBiayaLain ',detailBiayaLain);

      for (let i = 0; i < detailBiayaLain.length; i++) {
        let c_invoice_biaya_lain_id = detailBiayaLain[i].c_invoice_biaya_lain_id
          ? detailBiayaLain[i].c_invoice_biaya_lain_id
          : null;
        let kode_detail_ppn = detailBiayaLain[i].kode_detail_ppn
          ? detailBiayaLain[i].kode_detail_ppn
          : "V0";
        let nominal = detailBiayaLain[i].nominal
          ? detailBiayaLain[i].nominal
          : 0;

        let percentagePpn = 0;

        if (kode_detail_ppn == "V1") {
          percentagePpn = 10;
        } else if (kode_detail_ppn == "V2") {
          percentagePpn = 1;
        } else if (kode_detail_ppn == "V3") {
          percentagePpn = 11;
        } else if (kode_detail_ppn == "V4") {
          percentagePpn = 1.1;
        }


        let nominalPpn = (nominal * percentagePpn) / 100;
        taxAmount = taxAmount + nominalPpn;

        console.log("hasil dari nominal", nominal);
        console.log("hasil dari percentagePpn", percentagePpn);

        console.log("hasil dari nominal ppn", nominalPpn);
        console.log("hasil dari nominal ppn", taxAmount);
      

        if (c_invoice_biaya_lain_id) {
          let updateDataBiayaLainPpn = `UPDATE c_invoice_biaya_lain SET kode_detail_ppn = '${kode_detail_ppn}' 
          WHERE c_invoice_biaya_lain_id = '${c_invoice_biaya_lain_id}'`;
          await request.query(updateDataBiayaLainPpn);
        }

        taxBaseAmount = taxBaseAmount + nominal;
      }

      let selectJenisPajak = `SELECT DISTINCT kode_detail_ppn FROM c_invoice_biaya_lain WHERE c_invoice_id = '${c_invoice_id}' AND kode_detail_ppn <> 'V0'`;
      let dataJenisPajak = await request.query(selectJenisPajak);
      jumlahJenisPajak = dataJenisPajak.recordset.length;

      // console.log('jumlahJenisPajak ',jumlahJenisPajak);
    }

    let perihalKlaim = perihal_klaim ? perihal_klaim.substring(0, 50) : "";
    // console.log(rolename);

    // rolename=='LOGISTIKHEAD'
    if (kode_status == "APL") {
      let sql = `UPDATE c_invoice 
        SET updated=getdate(),
        updatedby = '${m_user_id}',
        status='Approve Head Logistik',
        kode_status = 'APLH',
        date_approve_logistik_head = getdate()
        WHERE c_invoice_id='${c_invoice_id}'`;
      await request.query(sql);

      let insertAudit = `INSERT INTO audit_submit_faktur
        (c_invoice_id, m_user_id, status, reason_reject,kode_status)
        VALUES('${c_invoice_id}', '${m_user_id}', 'Approve Head Logistik', NULL,'APLH')`;

      await request.query(insertAudit);

      return res.success({
        message: "Approve NPB successfully",
      });

      // rolename=='LOGISTIKFINANCE'
    } else if (kode_status == "APLH") {
      let sql = `UPDATE c_invoice 
      SET updated=getdate(),
      updatedby = '${m_user_id}',
      status='Approve accounting dan menunggu dokumen fisik dan nomor resi dari transporter',
      kode_status = 'APLHF',
      date_approve_finance = getdate()
      WHERE c_invoice_id='${c_invoice_id}'`;
      await request.query(sql);

      let insertAudit = `INSERT INTO audit_submit_faktur
      (c_invoice_id, m_user_id, status, reason_reject,kode_status)
      VALUES('${c_invoice_id}', '${m_user_id}', 'Approve Finance', NULL,'APLHF')`;

      await request.query(insertAudit);

      return res.success({
        message: "Approve NPB successfully",
      });
    } else if (kode_status == "APLHF") {
      let nomor_resi_text = nomor_resi ? `'${nomor_resi}'` : "NULL";
      let kurir_text = perusahaan_kurir ? `'${perusahaan_kurir}'` : "NULL";

      let sql = `UPDATE c_invoice 
      SET updated=getdate(),
      updatedby = '${m_user_id}',
      status='Fisik dokumen sudah dikirim oleh transporter dan menunggu verifikasi logistik',
      kode_status = 'WT1',
      nomor_resi = ${nomor_resi_text},
      perusahaan_kurir = ${kurir_text},
      date_kirim_document_fisik_by_transporter = getdate()
      WHERE c_invoice_id='${c_invoice_id}'`;

      // console.log(sql);
      await request.query(sql);

      let insertAudit = `INSERT INTO audit_submit_faktur
      (c_invoice_id, m_user_id, status, reason_reject,kode_status)
      VALUES('${c_invoice_id}', '${m_user_id}', 'Fisik dokumen sudah dikirim oleh transporter dan menunggu verifikasi logistik', NULL,'WT1')`;

      await request.query(insertAudit);

      return res.success({
        message: "Approve NPB successfully",
      });
    } else if (kode_status == "WT1") {
      let sql = `UPDATE c_invoice 
      SET updated=getdate(),
      updatedby = '${m_user_id}',
      status='Dokumen fisik sudah diverifikasi logistik staff dan menunggu dokumen verifikasi oleh head logistik',
      kode_status = 'WT2',
      date_verifikasi_logistik = getdate()
      WHERE c_invoice_id='${c_invoice_id}'`;
      await request.query(sql);

      let insertAudit = `INSERT INTO audit_submit_faktur
      (c_invoice_id, m_user_id, status, reason_reject,kode_status)
      VALUES('${c_invoice_id}', '${m_user_id}', 'Dokumen fisik sudah diverifikasi logistik staff dan menunggu dokumen verifikasi oleh head logistik', NULL,'WT2')`;
      await request.query(insertAudit);

      return res.success({
        message: "Approve NPB successfully",
      });
    } else if (kode_status == "WT2") {
      let sql = `UPDATE c_invoice 
      SET updated=getdate(),
      updatedby = '${m_user_id}',
      status='Dokumen fisik sudah diverifikasi head logistik dan menunggu verifikasi oleh accounting',
      kode_status = 'WT3',
      date_verifikasi_accounting = getdate()
      WHERE c_invoice_id='${c_invoice_id}'`;

      console.log(sql);
      await request.query(sql);

      let insertAudit = `INSERT INTO audit_submit_faktur
      (c_invoice_id, m_user_id, status, reason_reject,kode_status)
      VALUES('${c_invoice_id}', '${m_user_id}', 'Dokumen fisik sudah diverifikasi head logistik dan menunggu verifikasi oleh accounting', NULL,'WT3')`;
      await request.query(insertAudit);

      return res.success({
        message: "Approve NPB successfully",
      });
    } else if (kode_status == "WT3") {
      // PROSES SOAP

      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi =
        datastatusIntegasi.recordset.length > 0
          ? datastatusIntegasi.recordset[0].status
          : "DEV";

      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;

      let url = ``;
      if (statusIntegasi == "DEV") {
        url =
          "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_wms_miro/120/zws_wms_miro/zbn_wms_do"; //development

        usernamesoap = sails.config.globals.usernamesoapdev;
        passwordsoap = sails.config.globals.passwordsoapdev;
      } else {
        url =
          "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_wms_miro/300/zws_wms_miro/zbn_wms_miro"; // production
      }

      //  let usernamesoap = sails.config.globals.usernamesoap;
      //  let passwordsoap = sails.config.globals.passwordsoap;
      const tok = `${usernamesoap}:${passwordsoap}`;
      const hash = Base64.encode(tok);
      const Basic = "Basic " + hash;

      let dataHeader = [];
      let dataDetail = [];
      let dataTax = [];
      let dataWithTax = [];

      let tanggalInvoice = dataInvoice.tanggal_invoice;
      let nomorInvoice = dataInvoice.nomor_invoice;
      let nominalInvoiceSesudahPpn = dataInvoice.nominal_invoice_sesudah_ppn;
      let nomorFaktur = dataInvoice.nomor_faktur;
      let namatTransporter = dataInvoice.nama_transporter;

      let partnerBankTemp = null;
      if (r_partner_bank_key_id) {
        let sqlGetPartnerBank = `SELECT part_bank_key FROM r_partner_bank_key WHERE r_partner_bank_key_id = '${r_partner_bank_key_id}'`;
        // console.log(sqlGetPartnerBank);
        let getPartnerBank = await request.query(sqlGetPartnerBank);
        partnerBankTemp =
          getPartnerBank.recordset.length > 0
            ? getPartnerBank.recordset[0].part_bank_key
            : null;
      }

      let houseBankTemp = null;
      if (r_house_bank) {
        let sqlGetHouseBank = `SELECT house_bank FROM r_house_bank WHERE r_house_bank = '${r_house_bank}'`;
        console.log(sqlGetHouseBank);
        let getHouseBank = await request.query(sqlGetHouseBank);
        houseBankTemp =
          getHouseBank.recordset.length > 0
            ? getHouseBank.recordset[0].house_bank
            : null;
      }

      let calculatePajak = jumlahJenisPajak > 1 ? "X" : "";

      // SET DATA DETAIL
      let objHeader = {
        INVOICE_IND: "X",
        DOC_TYPE: "RE",
        DOC_DATE: tanggalInvoice,
        PSTNG_DATE: posting_date
          ? moment(posting_date, "YYYY-MM-DD").format("YYYY-MM-DD")
          : "",
        REF_DOC_NO: nomorInvoice,
        COMP_CODE: company_code ? company_code : "2100",
        DIFF_INV: "",
        CURRENCY: "IDR",
        CURRENCY_ISO: "",
        EXCH_RATE: "00.00",
        EXCH_RATE_V: "",
        GROSS_AMOUNT: Math.round(nominalInvoiceSesudahPpn),
        CALC_TAX_IND: calculatePajak,
        PMNTTRMS: payment_term ? payment_term : "",
        BLINE_DATE: base_line_date
          ? moment(base_line_date, "YYYY-MM-DD").format("YYYY-MM-DD")
          : "",
        DSCT_DAYS1: "",
        DSCT_DAYS2: "",
        NETTERMS: "",
        DSCT_PCT1: "",
        DSCT_PCT2: "",
        IV_CATEGORY: "",
        HEADER_TXT: nomorFaktur ? nomorFaktur.substring(0, 25) : "",
        PMNT_BLOCK: "",
        DEL_COSTS: "",
        DEL_COSTS_TAXC: "",
        DEL_COSTS_TAXJ: "",
        PERSON_EXT: "",
        PYMT_METH: "T",
        PMTMTHSUPL: "",
        INV_DOC_NO: "",
        SCBANK_IND: "",
        SUPCOUNTRY: "",
        BLLSRV_IND: "",
        REF_DOC_NO_LONG: "",
        DSCT_AMOUNT: "",
        PO_SUB_NO: "",
        PO_CHECKDG: "",
        PO_REF_NO: "",
        PAYEE_PAYER: "",
        PARTNER_BK: partnerBankTemp ? partnerBankTemp : "",
        HOUSEBANKID: houseBankTemp ? houseBankTemp : "",
        ALLOC_NMBR: namatTransporter ? namatTransporter.substring(0, 18) : "",
        PAYMT_REF: "",
        INV_REF_NO: "",
        INV_YEAR: "",
        INV_REC_DATE: "",
        PLANNING_LEVEL: "",
        PLANNING_DATE: "",
        FIXEDTERMS: "",
        BUS_AREA: "",
        LOT_NUMBER: "",
        ITEM_TEXT: perihalKlaim ? perihalKlaim : "",
        J_1BNFTYPE: "",
        EU_TRIANG_DEAL: "",
        REPCOUNTRY: "",
        VAT_REG_NO: "",
        BUSINESS_PLACE: "",
        TAX_EXCH_RATE: "",
        GOODS_AFFECTED: "",
        RET_DUE_PROP: "",
        DELIV_POSTING: "",
        RETURN_POSTING: "",
        INV_TRAN: "",
        SIMULATION: "",
        J_1TPBUPL: "",
        SECCO: "",
        VATDATE: "",
        DE_CRE_IND: "",
        TRANS_DATE: "",
        TAX_CODE: kode_ppn,
      };

      console.log('objHeader ',objHeader);

      dataHeader.push(objHeader);
      let xml = fs.readFileSync("soap/ZBN_WMS_DO.xml", "utf-8");
      let header = racikXMLHeader(xml, dataHeader, "HEADERDATA");

      let sqlGetDataDetail = `SELECT nomor_po,kode_material,nomor_gr,fiscal_year,nominal,kode_detail_ppn
      FROM c_invoice_biaya_lain WHERE c_invoice_id = '${c_invoice_id}' AND kode_item IS NULL`;
      console.log(sqlGetDataDetail);
      let getDataDetail = await request.query(sqlGetDataDetail);
      let dataDetailInvoice = getDataDetail.recordset;

      let line = 0;
      for (let i = 0; i < dataDetailInvoice.length; i++) {
        line = line + 10;
        let nomor_po = dataDetailInvoice[i].nomor_po;
        let item_cost_shipment = dataDetailInvoice[i].kode_material;
        let nomor_gr = dataDetailInvoice[i].nomor_gr;
        let tahun = dataDetailInvoice[i].fiscal_year;
        let cost_shipment = dataDetailInvoice[i].nominal;
        let kode_detail_ppn = dataDetailInvoice[i].kode_detail_ppn;

        let obj = {
          INVOICE_DOC_ITEM: line,
          PO_NUMBER: nomor_po,
          PO_ITEM: "10",
          REF_DOC: nomor_gr,
          REF_DOC_YEAR: tahun,
          REF_DOC_IT: item_cost_shipment,
          DE_CRE_IND: "",
          TAX_CODE: kode_detail_ppn,
          TAXJURCODE: "",
          ITEM_AMOUNT: cost_shipment,
          QUANTITY: 1,
          PO_UNIT: "AU",
          PO_UNIT_ISO: "",
          PO_PR_QNT: "",
          PO_PR_UOM: "",
          PO_PR_UOM_ISO: "",
          COND_TYPE: "",
          COND_ST_NO: "",
          COND_COUNT: "",
          SHEET_NO: "",
          ITEM_TEXT: "",
          FINAL_INV: "",
          SHEET_ITEM: "",
          GRIR_CLEAR_SRV: "",
          FREIGHT_VEN: "",
          CSHDIS_IND: "",
          RETENTION_DOCU_CURRENCY: "",
          RETENTION_PERCENTAGE: "",
          RETENTION_DUE_DATE: "",
          NO_RETENTION: "",
          VALUATION_TYPE: "",
          INV_RELATION: "",
          INV_ITM_ORIGIN: "",
          COND_COUNT_LONG: "",
          DEL_CREATE_DATE: "",
        };

        dataDetail.push(obj);
      }

      let sqlGetDataDetailAddtionalCost = `SELECT cibl.nomor_po,cibl.kode_material,
      cibl.nomor_gr,cibl.fiscal_year,cibl.nominal,cibl.kode_item,cibl.kode_detail_ppn
      FROM c_invoice_biaya_lain cibl 
      WHERE cibl.c_invoice_id = '${c_invoice_id}' AND kode_item IS NOT NULL`;
      // console.log(sqlGetDataDetailAddtionalCost);
      let getDataDetailAdditionalCost = await request.query(
        sqlGetDataDetailAddtionalCost
      );
      let dataDetailInvoiceAdditionalCost =
        getDataDetailAdditionalCost.recordset;

      for (let i = 0; i < dataDetailInvoiceAdditionalCost.length; i++) {
        line = line + 10;
        let nomor_po = dataDetailInvoiceAdditionalCost[i].nomor_po;
        let item_additional_cost =
          dataDetailInvoiceAdditionalCost[i].kode_material;
        let nomor_gr_additional_cost =
          dataDetailInvoiceAdditionalCost[i].nomor_gr;
        let tahun = dataDetailInvoiceAdditionalCost[i].fiscal_year;
        let additional_cost = dataDetailInvoiceAdditionalCost[i].nominal;
        let kode_item = dataDetailInvoiceAdditionalCost[i].kode_item;
        let kode_detail_ppn =
          dataDetailInvoiceAdditionalCost[i].kode_detail_ppn;

        let obj = {
          INVOICE_DOC_ITEM: line,
          PO_NUMBER: nomor_po,
          PO_ITEM: item_additional_cost,
          REF_DOC: nomor_gr_additional_cost,
          REF_DOC_YEAR: tahun,
          REF_DOC_IT: kode_item,
          DE_CRE_IND: "",
          TAX_CODE: kode_detail_ppn,
          TAXJURCODE: "",
          ITEM_AMOUNT: additional_cost,
          QUANTITY: 1,
          PO_UNIT: "AU",
          PO_UNIT_ISO: "",
          PO_PR_QNT: "",
          PO_PR_UOM: "",
          PO_PR_UOM_ISO: "",
          COND_TYPE: "",
          COND_ST_NO: "",
          COND_COUNT: "",
          SHEET_NO: "",
          ITEM_TEXT: "",
          FINAL_INV: "",
          SHEET_ITEM: "",
          GRIR_CLEAR_SRV: "",
          FREIGHT_VEN: "",
          CSHDIS_IND: "",
          RETENTION_DOCU_CURRENCY: "",
          RETENTION_PERCENTAGE: "",
          RETENTION_DUE_DATE: "",
          NO_RETENTION: "",
          VALUATION_TYPE: "",
          INV_RELATION: "",
          INV_ITM_ORIGIN: "",
          COND_COUNT_LONG: "",
          DEL_CREATE_DATE: "",
        };

        dataDetail.push(obj);
      }

      let detail = racikXMLDetail(header, dataDetail, "ITEMDATA");

      // console.log('dasar_pengenaan_pajak ',dasar_pengenaan_pajak);
      // console.log('kode_ppn ',kode_ppn);
      // console.log('taxBaseAmount ',taxBaseAmount);
      // console.log('taxAmount ',taxAmount);

      let objTax = {
        TAX_CODE: kode_ppn,
        TAX_AMOUNT: Math.round(taxAmount),
        TAX_BASE_AMOUNT: taxBaseAmount,
        COND_TYPE: "",
        TAXJURCODE: "",
        TAXJURCODE_DEEP: "",
        ITEMNO_TAX: "",
        TAX_AMOUNT_LOCAL: "",
        TAX_BASE_AMOUNT_LOCAL: "",
      };

      dataTax.push(objTax);
      let detailTax =
        jumlahJenisPajak > 1
          ? racikXMLTaxDatakOSONG(detail)
          : racikXMLTaxData(detail, dataTax, "TAXDATA");
      // console.log('detailTax ',detailTax);

      if (tipe_pph) {
        // JIKA BASE LINE PPH > 0 MAKA NILAI PPH MENGGUNAKAN BASE LINE

        let nilaiDpp =
          base_pph && base_pph > 0 ? base_pph : dasar_pengenaan_pajak;

        let objWithTax = {
          SPLIT_KEY: "000001",
          WI_TAX_TYPE: tipe_pph ? tipe_pph : "",
          WI_TAX_CODE: kode_pph ? kode_pph : "",
          WI_TAX_BASE: nilaiDpp ? nilaiDpp : "",
          WI_TAX_AMT: jumlahHasilPph ? jumlahHasilPph : "",
          WI_TAX_WITHHELD_AMT: "",
        };

        dataWithTax.push(objWithTax);
      }

      let detailWithTax = racikXMLWithTaxData(
        detailTax,
        dataWithTax,
        "WITHTAXDATA"
      );
      console.log('detailWithTax ',detailWithTax);

      let Headers = {
        Authorization: Basic,
        "user-agent": "apiesales",
        "Content-Type": "text/xml;charset=UTF-8",
        soapAction:
          "urn:sap-com:document:sap:rfc:functions:ZWS_WMS_MIRO:ZFM_WS_MIRORequest",
      };

      let { response } = await soapRequest({
        url: url,
        headers: Headers,
        xml: detailWithTax,
        timeout: 1000000,
      });
      let { body, statusCode } = response;

      console.log("status",statusCode);

      // AUDIT SOAP
      console.log("lemparan =============================================================");
      let insertAuditSoap = `INSERT INTO audit_soap
      (audit_soap_id, isactive, created, createdby, updated, updatedby, transaction_id, soap_format)
      VALUES(newid(), 'Y', getdate(), '${m_user_id}', getdate(), '${m_user_id}', '${c_invoice_id}', '${detailWithTax}')`;
      await request.query(insertAuditSoap);

      // console.log('statusCode ',statusCode);
      // console.log('body ',body);

      if (statusCode == 200) {
        let payment_term_text = payment_term ? `'${payment_term}'` : "NULL";
        let company_code_text = company_code ? `'${company_code}'` : "NULL";
        let r_pajak_text = r_pajak_id ? `'${r_pajak_id}'` : "NULL";
        let r_partner_bank_key_text = r_partner_bank_key_id
          ? `'${r_partner_bank_key_id}'`
          : "NULL";
        let r_house_bank_text = r_house_bank ? `'${r_house_bank}'` : "NULL";

        let partnerBank = partnerBankTemp ? `'${partnerBankTemp}'` : "NULL";
        let perihal_klaim_text = perihal_klaim ? `'${perihal_klaim}'` : "NULL";

        let dataError = [];
        var parser = new xml2js.Parser({ explicitArray: false });
        parser.parseString(body, async function (err, result) {
          if (err) {
            return res.error({
              message: err,
            });
          }

          let OUT_RETURN =
            result["soap-env:Envelope"]["soap-env:Body"][
              "n0:ZFM_WS_MIROResponse"
            ].RETURN;

            console.log(OUT_RETURN,"cek hasil return");
          let INVOICEDOCNUMBER =
            result["soap-env:Envelope"]["soap-env:Body"][
              "n0:ZFM_WS_MIROResponse"
            ].INVOICEDOCNUMBER;
          let FISCALYEAR =
            result["soap-env:Envelope"]["soap-env:Body"][
              "n0:ZFM_WS_MIROResponse"
            ].FISCALYEAR;

          // console.log(OUT_RETURN);

          let no_sap = INVOICEDOCNUMBER ? `'${INVOICEDOCNUMBER}'` : "NULL";
          let fiscal_year =
            FISCALYEAR && FISCALYEAR != "0000" ? `'${FISCALYEAR}'` : "NULL";

          const arrayOrNo = Array.isArray(OUT_RETURN.item);

          if (!INVOICEDOCNUMBER) {
            if (arrayOrNo) {
              if (OUT_RETURN) {
                let itemError = OUT_RETURN.item;

                for (let i = 0; i < itemError.length; i++) {
                  dataError.push(itemError[i].MESSAGE);
                }
              }
            } else {
              dataError.push(OUT_RETURN.item.MESSAGE);
            }
          }

          if (dataError.length > 0) {
            return res.success({
              error: true,
              message: dataError.toString(),
            });
          } else {
            let base_pph_nominal = base_pph ? base_pph : 0;

            let sql = `UPDATE c_invoice 
            SET updated=getdate(),
            updatedby = '${m_user_id}',
            status='Finish Submit to SAP',
            kode_status = 'WT4',
            date_submit_sap_by_accounting = getdate(),
            payment_term = ${payment_term_text},
            company_code = ${company_code_text},
            r_pajak_id = ${r_pajak_text},
            r_partner_bank_key_id = ${r_partner_bank_key_text},
            partner_bank = ${partnerBank},
            r_house_bank = ${r_house_bank_text},
            perihal_klaim = ${perihal_klaim_text},
            nomor_sap = ${no_sap},
            fiscal_year = ${fiscal_year},
            base_line_date = '${base_line_date}',
            posting_date = '${posting_date}',
            jumlah_pph = ${jumlahHasilPph},
            base_pph = ${base_pph_nominal}
            WHERE c_invoice_id='${c_invoice_id}'`;

            console.log(sql);
            await request.query(sql);

            let insertAudit = `INSERT INTO audit_submit_faktur
            (c_invoice_id, m_user_id, status, reason_reject,kode_status)
            VALUES('${c_invoice_id}', '${m_user_id}', 'Finish Submit to SAP', NULL,'WT4')`;
            await request.query(insertAudit);

            return res.success({
              message: "Approve NPB successfully",
            });
          }
        });
      } else {
        return res.success({
          error: true,
          message: "Approve Gagal!",
        });
      }
    } else {
      var uploadFile = req.file("file");
      uploadFile.upload(
        { maxBytes: 500000000000 },
        async function onUploadComplete(err, files) {
          if (err) {
            let errMsg = err.message;
            return res.error(errMsg);
          }

          for (const file of files) {
            // ..disini move ke tempat semestinya
            fs.mkdirSync(dokumentPath("submitfaktur", c_invoice_id), {
              recursive: true,
            });
            const filesamaDir = glob.GlobSync(
              path.resolve(
                dokumentPath("submitfaktur", c_invoice_id),
                "file_dokumen_pengecekan".replace(/\.[^/.]+$/, "")
              ) + "*"
            );
            if (filesamaDir.found.length > 0) {
              fs.unlinkSync(filesamaDir.found[0]);
            }
            fs.renameSync(
              file.fd,
              path.resolve(
                dokumentPath("submitfaktur", c_invoice_id),
                "file_dokumen_pengecekan" +
                  getExtOnly(file.filename) /*'file_po'*/
              )
            );
          }

          let fieldfile_dokumen_pengecekan =
            file_dokumen_pengecekan &&
            file_dokumen_pengecekan != "null" &&
            file_po != "undefined"
              ? `'${file_dokumen_pengecekan}'`
              : `NULL`;
          let nomor_po_text =
            nomor_po && nomor_po != "null" && file_po != "undefined"
              ? `'${nomor_po}'`
              : `NULL`;
          let nomor_gr_text =
            nomor_gr && nomor_gr != "null" && file_po != "undefined"
              ? `'${nomor_gr}'`
              : `NULL`;
          let file_po_text =
            file_po && file_po != "null" && file_po != "undefined"
              ? `'${file_po}'`
              : `NULL`;

          try {
            let sql = `UPDATE c_invoice 
                  SET updated=getdate(),
                  date_approve_logistik = getdate(),
                  updatedby = '${m_user_id}',
                  status='Approve Logistik',
                  reason=NULL,
                  nomor_po=${nomor_po_text},
                  nomor_gr=${nomor_gr_text},
                  file_po=${file_po_text},
                  potongan_invoice=${pengurang_invoice},
                  file_dokumen_pengecekan=${fieldfile_dokumen_pengecekan},
                  kode_status = 'APL'
                  WHERE c_invoice_id='${c_invoice_id}'`;

            request.query(sql, async (err, result) => {
              if (err) {
                return res.error(err);
              }

              let insertAudit = `INSERT INTO audit_submit_faktur
                      (c_invoice_id, m_user_id, status, reason_reject,kode_status)
                      VALUES('${c_invoice_id}', '${m_user_id}', 'Approve Logistik', NULL,'APL')`;

              await request.query(insertAudit);

              return res.success({
                message: "Approve NPB successfully",
              });
            });
          } catch (err) {
            return res.error(err);
          }
        }
      );
    }
  },

  rejectNpb: async function (req, res) {
    const { m_user_id, c_invoice_id, reason } = req.body;
    await DB.poolConnect;
    // console.log(reason);
    try {
      const request = DB.pool.request();

      let sqlGetDataInvoice = `SELECT * FROM c_invoice WHERE c_invoice_id='${c_invoice_id}'`;

      console.log(sqlGetDataInvoice);

      let dataInvoice = await request.query(sqlGetDataInvoice);
      let data = dataInvoice.recordset[0];
      let kode_status = data.kode_status;

      let reasonReject = reason ? `'${reason}'` : "NULL";

      let sql = ``;
      if (kode_status == "DR" || kode_status == "WT1") {
        sql = `UPDATE c_invoice 
        SET updated=getdate(),
        updatedby = '${m_user_id}',
        status='Reject',
        kode_status='RJL',
        reason=${reasonReject}
        WHERE c_invoice_id='${c_invoice_id}'`;
        await request.query(sql);

        let selEmail = `select a.m_transporter_id,convert(varchar(10),tanggal_invoice,120) tgl_inv,* from c_invoice_v a
        inner join email_transporter b on a.m_transporter_id = b.m_transporter_id
        where c_invoice_id = '${c_invoice_id}'`;

        let rsEmail = await request.query(selEmail);
        let dataEmail = rsEmail.recordset;
        let nama_transporter = dataEmail[0].nama;
        let nomor_invoice = dataEmail[0].nomor_invoice;
        let tanggal_invoice = dataEmail[0].tgl_inv;
        let dataEmailReject = [];
        for (var i = 0; i < dataEmail.length; i++) {
          //console.log(dataEmail[i].email_verifikasi);
          dataEmailReject.push(dataEmail[i].email_verifikasi);
        }

        if (dataEmailReject.length > 0) {
          const param = {
            subject: "Pengajuan Faktur Ditolak",
            transporter: nama_transporter,
            nomor_invoice: nomor_invoice,
            tanggal_invoice: tanggal_invoice,
            alasan: reason,
          };

          const template = await sails.helpers.generateHtmlEmail.with({
            htmltemplate: "rejectfaktur",
            templateparam: param,
          });
          SendEmail(dataEmailReject.toString(), param.subject, template);
        }
      } else {
        sql = `UPDATE c_invoice 
        SET updated=getdate(),
        updatedby = '${m_user_id}',
        status='Verifikasi ulang logistik staff',
        kode_status='RJL',
        reason=${reasonReject}
        WHERE c_invoice_id='${c_invoice_id}'`;
        await request.query(sql);

        let selEmail = `select a.m_transporter_id,convert(varchar(10),tanggal_invoice,120) tgl_inv,* from c_invoice_v a
        inner join email_transporter b on a.m_transporter_id = b.m_transporter_id
        where c_invoice_id = '${c_invoice_id}'`;

        let rsEmail = await request.query(selEmail);
        let dataEmail = rsEmail.recordset;
        let nama_transporter = dataEmail.length > 0 ? dataEmail[0].nama : null;
        let nomor_invoice =
          dataEmail.length > 0 ? dataEmail[0].nomor_invoice : null;
        let tanggal_invoice =
          dataEmail.length > 0 ? dataEmail[0].tgl_inv : null;
        let dataEmailReject = [];
        for (var i = 0; i < dataEmail.length; i++) {
          //console.log(dataEmail[i].email_verifikasi);
          dataEmailReject.push(dataEmail[i].email_verifikasi);
        }

        if (dataEmailReject.length > 0) {
          const param = {
            subject: "Pengajuan Faktur Reject",
            transporter: nama_transporter,
            nomor_invoice: nomor_invoice,
            tanggal_invoice: tanggal_invoice,
            alasan: reason,
          };

          const template = await sails.helpers.generateHtmlEmail.with({
            htmltemplate: "rejectfaktur",
            templateparam: param,
          });
          SendEmail(dataEmailReject.toString(), param.subject, template);
        }
      }

      let insertAudit = `INSERT INTO audit_submit_faktur
      (c_invoice_id, m_user_id, status, reason_reject)
      VALUES('${c_invoice_id}', '${m_user_id}', 'Reject', ${reasonReject})`;

      await request.query(insertAudit);

      return res.success({
        message: "Reject Billing successfully",
      });
    } catch (err) {
      return res.error(err);
    }
  },

  rejectFinance: async function (req, res) {
    const { m_user_id, c_invoice_id, reason } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let sql = `UPDATE c_invoice SET updated=getdate(),
      updatedby = '${m_user_id}',
      kode_status='RJF',status='Reject',reason='${reason}'
      nomor_po=NULL,
      nomor_gr=NULL,
      file_po=NULL
      WHERE c_invoice_id='${c_invoice_id}'`;

      request.query(sql, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let queryDataTable = `SELECT 
        ci.c_invoice_id, ci.isactive, ci.created, ci.createdby, ci.updated, ci.updatedby, 
        ci.m_transporter_id, ci.nomor_invoice, ci.tanggal_invoice, 
        ci.dasar_pengenaan_pajak AS nominal_invoice_sebelum_ppn,
        ci.dasar_pengenaan_pajak,ci.ppn,
        ci.dasar_pengenaan_pajak * ci.ppn / 100 AS nominal_ppn, 
        ci.npwp, ci.file_nota_pengiriman_barang, ci.file_add_cost,
        ci.nomor_rekening, ci.nomor_surat_keterangan_bebas_pajak, ci.file_surat_keterangan_bebas_pajak, ci.nomor_faktur,ci.file_faktur_pajak, 
        ci.tanggal_faktur, ci.file_invoice, ci.tanggal_surat_jalan, ci.nomor_surat_jalan, ci.nomor_po, ci.file_po, 
        ci.nominal_invoice_sesudah_ppn, ci.keterangan_ppn, ci.status, ci.kode_status,ci.reason,
        ci.potongan_invoice AS pengurang_invoice,ci.file_dokumen_pengecekan,
        mtv.r_organisasi_id,mtv.kode,mtv.nama,ci.documentno
        FROM c_invoice ci LEFT JOIN 
        m_transporter_v mtv ON(mtv.m_transporter_id = ci.m_transporter_id)
        WHERE ci.isactive='Y' AND ci.c_invoice_id='${c_invoice_id}'`;

        let data_faktur = await request.query(queryDataTable);
        let faktur = data_faktur.recordset;

        for (let i = 0; i < faktur.length; i++) {
          let queryDataTableDetail = `SELECT * FROM c_invoice_detail WHERE c_invoice_id='${c_invoice_id}'`;
          let data_fakturdetail = await request.query(queryDataTableDetail);
          faktur[i].lines = data_fakturdetail.recordset;
        }

        return res.success({
          result: faktur[0],
          message: "Reject Faktur Transporter successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  approveFinance: async function (req, res) {
    const { m_user_id, c_invoice_id } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let sql = `UPDATE c_invoice SET updated=getdate(),
      updatedby = '${m_user_id}',
      kode_status='APF',status='Approved',reason=NULL
      WHERE c_invoice_id='${c_invoice_id}'`;

      request.query(sql, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let queryDataTable = `SELECT 
        ci.c_invoice_id, ci.isactive, ci.created, ci.createdby, ci.updated, ci.updatedby, 
        ci.m_transporter_id, ci.nomor_invoice, ci.tanggal_invoice, 
        ci.dasar_pengenaan_pajak AS nominal_invoice_sebelum_ppn,
        ci.dasar_pengenaan_pajak,ci.ppn,
        ci.dasar_pengenaan_pajak * ci.ppn / 100 AS nominal_ppn, 
        ci.npwp, ci.file_nota_pengiriman_barang, 
        ci.nomor_rekening, ci.nomor_surat_keterangan_bebas_pajak, ci.file_surat_keterangan_bebas_pajak, ci.nomor_faktur,ci.file_faktur_pajak, 
        ci.tanggal_faktur, ci.file_invoice, ci.tanggal_surat_jalan, ci.nomor_surat_jalan, ci.nomor_po, ci.file_po, 
        ci.nominal_invoice_sesudah_ppn, ci.keterangan_ppn, ci.status, ci.kode_status,ci.reason,
        ci.potongan_invoice AS pengurang_invoice,ci.file_dokumen_pengecekan,
        mtv.r_organisasi_id,mtv.kode,mtv.nama,ci.documentno
        FROM c_invoice ci LEFT JOIN 
        m_transporter_v mtv ON(mtv.m_transporter_id = ci.m_transporter_id)
        WHERE ci.isactive='Y' AND ci.c_invoice_id='${c_invoice_id}'`;

        let data_faktur = await request.query(queryDataTable);
        let faktur = data_faktur.recordset;

        for (let i = 0; i < faktur.length; i++) {
          let queryDataTableDetail = `SELECT * FROM c_invoice_detail WHERE c_invoice_id='${c_invoice_id}'`;
          let data_fakturdetail = await request.query(queryDataTableDetail);
          faktur[i].lines = data_fakturdetail.recordset;
        }
        return res.success({
          result: faktur[0],
          message: "Approve Faktur Transporter successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  cetakNPB: async function (req, res) {
    const {
      query: { m_user_id },
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT 
      ci.c_invoice_id, ci.isactive, 
      ci.created, ci.createdby, ci.updated, ci.updatedby, 
      ci.m_transporter_id, ci.nomor_invoice, ci.tanggal_invoice,
      ci.dasar_pengenaan_pajak AS nominal_invoice_sebelum_ppn,
      ci.dasar_pengenaan_pajak,ci.ppn,
      ci.dasar_pengenaan_pajak * ci.ppn / 100 AS nominal_ppn, 
      ci.npwp, ci.file_nota_pengiriman_barang, 
      ci.nomor_rekening, 
      ci.nomor_surat_keterangan_bebas_pajak, 
      ci.file_surat_keterangan_bebas_pajak, 
      ci.nomor_faktur,ci.file_faktur_pajak, 
      CASE WHEN ci.ppn > 0 THEN 'PKP' ELSE 'NON PKP' END tipe_pajak,
      ci.tanggal_faktur, ci.file_invoice, ci.tanggal_surat_jalan, 
      ci.nomor_surat_jalan, ci.nomor_po, ci.file_po, 
      ci.nominal_invoice_sesudah_ppn, ci.keterangan_ppn, ci.status, ci.kode_status,
      ci.reason,ci.potongan_invoice AS pengurang_invoice,ci.file_dokumen_pengecekan,
      mtv.r_organisasi_id,mtv.kode,mtv.nama,ci.kubikasi,ci.documentno,
      ci.date_approve_logistik,
      ci.date_approve_logistik_head,
      CASE WHEN ci.file_dokumen_pengecekan IS NULL OR ci.file_dokumen_pengecekan = 'null' OR ci.file_dokumen_pengecekan = 'Undifined' THEN '' ELSE 'checked' END AS bast
      FROM c_invoice ci LEFT JOIN 
      m_transporter_v mtv ON(mtv.m_transporter_id = ci.m_transporter_id)
      WHERE ci.isactive='Y' AND ci.c_invoice_id='${req.param("id")}'`;

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }
        const row = result.recordset[0];

        let getdatainvoicedetail =
          await request.query(`SELECT c_invoice_detail_id,bundle_id,kode_kendaraan,jenis_kendaraan,
        CONVERT(VARCHAR(12),tanggal_pod_transporter,120) AS tanggal_pod_transporter,
        nomor_po,nomor_gr,cost_shipment,additional_cost,total
        FROM c_invoice_detail  WHERE c_invoice_id = '${row.c_invoice_id}' ORDER BY tanggal_pod_transporter`);
        let datainvoicedetail = getdatainvoicedetail.recordset;

        row.lines = datainvoicedetail;

        for (let index = 0; index < row.lines.length; index++) {
          row.lines[index].no = index + 1;
          row.lines[index].tgl_do = row.lines[index].tgl_do
            ? moment(row.lines[index].tgl_do, "DDD-MMM-YYYY").format(
                "YYYY-MMM-DD"
              )
            : "";

          row.lines[index].cost_shipment = numeral(
            row.lines[index].cost_shipment
          ).format("0,0");
          row.lines[index].additional_cost = numeral(
            row.lines[index].additional_cost
          ).format("0,0");
          row.lines[index].total = numeral(row.lines[index].total).format(
            "0,0"
          );
        }

        let tabledetail = _generateTableDetail(row.lines);

        let logo = `data:image/jpeg;base64,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`;

        console.log(tabledetail);

        row.baseurl = direktoricetak();
        row.tanggal_fkr = moment(row.created, "YYYY-MM-DD").format(
          "YYYY-MM-DD"
        );
        row.logoo =
          "data:image/png;base64," +
          Buffer.from(
            base64_encode(
              path.resolve(
                sails.config.appPath,
                "assets",
                "report",
                "submitfaktur",
                "assets",
                "log2.png"
              )
            )
          );
        row.tanggal_invoice = row.tanggal_invoice
          ? moment(row.tanggal_invoice, "DDD-MMM-YYYY").format("YYYY-MMM-DD")
          : "";
        row.date_approve_logistik = row.date_approve_logistik
          ? moment(row.date_approve_logistik, "YYYY-MM-DD").format(
              "YYYY-MMM-DD"
            )
          : "";
        row.date_approve_logistik_head = row.date_approve_logistik_head
          ? moment(row.date_approve_logistik_head, "YYYY-MM-DD").format(
              "YYYY-MMM-DD"
            )
          : "";
        row.tabledetail = tabledetail;
        const content = fs.readFileSync(
          path.resolve(direktoricetak(), "index.hbs"),
          "utf-8"
        );

        let paramHtml = {
          baseurl: row.baseurl,
          tanggal_fkr: row.tanggal_fkr,
          logo: logo,
          tanggal_invoice: row.tanggal_invoice,
          date_approve_logistik: row.date_approve_logistik,
          date_approve_logistik_head: row.date_approve_logistik_head,
          tabledetail: tabledetail,
          nama: row.nama,
          documentno: row.documentno,
          tabledetail: tabledetail,
        };

        let finalHtml = await sails.helpers.generateHtmlCetakNpb.with({
          htmltemplate: "index",
          templateparam: paramHtml,
        });
        // console.log(finalHtml);
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(finalHtml);

        let height = await page.evaluate(
          () => document.documentElement.offsetHeight
        );

        const buffer = await page.pdf({
          width: `1200px`,
          height: `${height + 1}px`,
          printBackground: true,
        });

        await browser.close();
        res.contentType(`application/pdf`);
        res.send(buffer);
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // DELETE RESOURCE
  delete: async function (req, res) {
    const { id } = req.body;
    console.log("id delete", JSON.stringify(req.body));
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      const sqlGetInvoice = `SELECT * FROM c_invoice WHERE c_invoice_id='${id}'`;
      const datainvoice = await request.query(sqlGetInvoice);
      const invoice = datainvoice.recordset[0];

      if (invoice.kode_status == "APL") {
        return res.error({
          message: `Faktur sudah diapprove Logistik`,
        });
      } else if (invoice.kode_status == "APLH") {
        return res.error({
          message: `Faktur sudah diapprove Head Logistik`,
        });
      }

      const sql = `DELETE FROM c_invoice WHERE c_invoice_id='${id}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Delete data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  calculateHeader: async function (req, res) {
    const {
      m_user_id,
      c_invoice_id,
      nominal_invoice_sesudah_ppn,
      nominal_pajak,
      biaya_lain,
    } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let detailBiayaLain = biaya_lain ? JSON.parse(biaya_lain) : [];
      console.log(detailBiayaLain);

      for (let i = 0; i < detailBiayaLain.length; i++) {
        let c_invoice_biaya_lain_id =
          detailBiayaLain[i].c_invoice_biaya_lain_id;
        let kode_detail_ppn = detailBiayaLain[i].kode_detail_ppn;

        let sqlUpdateDetailPpn = `UPDATE c_invoice_biaya_lain SET kode_detail_ppn='${kode_detail_ppn}' 
          WHERE c_invoice_biaya_lain_id = '${c_invoice_biaya_lain_id}'`;
        await request.query(sqlUpdateDetailPpn);
      }

      let updateData = `UPDATE c_invoice 
        SET nominal_invoice_sesudah_ppn = '${nominal_invoice_sesudah_ppn}',
        nominal_pajak='${nominal_pajak}',
        updatedby = '${m_user_id}'
        WHERE c_invoice_id = '${c_invoice_id}'`;

      await request.query(updateData);

      return res.success({
        message: "Update data successfully",
      });
    } catch (err) {
      return res.error(err);
    }
  },
  cekBAST: async function (req, res) {
    const { c_invoice_id, m_user_id } = req.query;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `SELECT CASE WHEN file_dokumen_pengecekan IS NULL OR file_dokumen_pengecekan = 'null' OR file_dokumen_pengecekan = 'Undifined' THEN 'N' ELSE 'Y' END AS bast FROM c_invoice WHERE c_invoice_id='${c_invoice_id}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];

        return res.success({
          data: row,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  getfile: async function (req, res) {
    //   const user = req.param('user')
    const record = req.param("record");
    const filename = req.param("filename");

    // const filepath = dokumentPath(user, 'submitfaktur', record)+'/'+filename

    const filesamaDir = glob.GlobSync(
      path.resolve(dokumentPath("submitfaktur", record), filename + "*")
    );
    if (filesamaDir.found.length > 0) {
      console.log(filesamaDir.found[0]);

      // return res.send(filesamaDir.found[0]);
      // return res.success('OK');
      var lastItemAkaFilename = path.basename(filesamaDir.found[0]);
      return res.download(filesamaDir.found[0], lastItemAkaFilename);
    }
    return res.error("Failed, File Not Found");
  },
  // "GET /submitfaktur/file/:user/:record/:filename"
};

function base64_encode(file) {
  var bitmap = fs.readFileSync(file);
  return new Buffer(bitmap).toString("base64");
}

function racikXML(xmlTemplate, result) {
  return xmlTemplate.replace("?", result);
}

function _generateTableDetail(table) {
  if (table.length > 0) {
    const addRowSpan = (column, i, rspan = true, cn = "") => {
      var row = table[i],
        prevRow = table[i - 1],
        td = `<td class="${cn}">${row[column]}</td>`;

      if (rspan) {
        if (prevRow && row[column] === prevRow[column]) {
          td = ``;
        } else {
          var rowspan = 1;

          for (var j = i; j < table.length - 1; j++) {
            if (table[j][column] === table[j + 1][column]) {
              rowspan++;
            } else {
              break;
            }
          }
          td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`;
        }
      }

      return td;
    };

    let content = "";
    for (let i = 0; i < table.length; i++) {
      content = content + `<tr class="mono-space">`;
      content = content + addRowSpan("no", i, false, "center");
      content = content + addRowSpan("bundle_id", i, false, "left");
      content = content + addRowSpan("kode_kendaraan", i, false, "left");
      content = content + addRowSpan("jenis_kendaraan", i, false, "left");
      content =
        content + addRowSpan("tanggal_pod_transporter", i, false, "left");
      content = content + addRowSpan("nomor_po", i, false, "left");
      content = content + addRowSpan("nomor_gr", i, false, "left");
      content = content + addRowSpan("cost_shipment", i, false, "right");
      content = content + addRowSpan("additional_cost", i, false, "right");
      content = content + addRowSpan("total", i, false, "right");
      content = content + `</tr>`;
    }

    return content;
  }

  return "<tr><td>No Data</td></tr>";
}

function racikXMLHeader(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });

  const result = builder.buildObject(jsonArray);

  return xmlTemplate.replace("header", result);
}

function racikXMLDetail(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const addTemplate = jsonArray.map((data) => {
    return { item: data };
  });
  const result = builder.buildObject(addTemplate);

  return xmlTemplate.replace("detail", result);
}

function racikXMLTaxData(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const addTemplate = jsonArray.map((data) => {
    return { item: data };
  });
  const result = builder.buildObject(addTemplate);

  return xmlTemplate.replace("taxdata", result);
}

function racikXMLTaxDatakOSONG(xmlTemplate) {
  return xmlTemplate.replace("taxdata", "");
}

function racikXMLWithTaxData(xmlTemplate, jsonArray, rootHead) {
  var builder = new xml2js.Builder({ headless: true, rootName: rootHead });
  const addTemplate = jsonArray.map((data) => {
    return { item: data };
  });
  const result = builder.buildObject(addTemplate);

  return xmlTemplate.replace("withtaxdata", result);
}

function pad(d) {
  var str = "" + d;
  var pad = "00000";
  var ans = pad.substring(0, pad.length - str.length) + str;
  return ans;
}

function GetTimeDiff(seconds) {
  let how_log_ago = "";
  let minutes = Math.round(seconds / 60);
  let hours = Math.round(minutes / 60);
  let days = Math.round(hours / 24);

  if (days >= 1) {
    how_log_ago = days + " day" + (days != 1 ? "s" : "");
  } else if (hours >= 1) {
    how_log_ago = hours + " hour" + (hours != 1 ? "s" : "");
  } else if (minutes >= 1) {
    how_log_ago = minutes + " minute" + (minutes != 1 ? "s" : "");
  } else {
    how_log_ago = seconds + " second" + (seconds != 1 ? "s" : "");
  }

  how_log_ago = seconds == 0 ? "-" : how_log_ago;

  return how_log_ago;
}
