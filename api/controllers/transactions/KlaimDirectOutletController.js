/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const { calculateLimitAndOffset, paginate } = require("paginate-info");
const axios = require("axios");
const moment = require("moment");
const FormData = require("form-data");
const uuid = require("uuid/v4");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const numeral = require("numeral");
const _ = require("lodash");
const SendEmail = require("../../services/SendEmail");
const { request } = require("http");
const json2xls = require("json2xls");

const Base64 = require("base-64");
const soapRequest = require("easy-soap-request");
const xml2js = require("xml2js");
const { number } = require("joi");
const { log } = require("console");
const ClientSFTP = require("ssh2-sftp-client");
var shell = require("shelljs");
let sftp = new ClientSFTP();
const ftpconfig = {
  host: "192.168.1.148",
  port: 22,
  user: "root",
  password: "P@ssw0rd1988",
};
const DBPROP = require("../../services/DBPROPOSAL");
const { getKlaim } = require("./KlaimProposalController");

const dokumentPath = (param2, param3) =>
  path.resolve(sails.config.appPath, "repo", param2, param3);
const re = /(?:\.([^.]+))?$/;
const getExtOnly = (str, adddot = true) => {
  const result = re.exec(str)[1];
  if (result) return adddot ? "." + result : result;
  return "";
};
module.exports = {


  approveKlaim: async function (req, res) {
    const {
      m_user_id,
      klaim_id,
      nama_ktp,
      nomor_ktp,
      r_pajak_id,
      tanggal_posting,
      nominal_claimable,
      r_gl_id,
      value_gl,
      r_ar_id,
      value_ar,
      pph,
      r_partner_bank_key_id,
      r_payment_term_klaim_id,
      opsional_pph,
      noted,
      nama_npwp,
      nomor_faktur,
      tanggal_faktur_pajak,
      nomor_npwp,
      invoice,
      r_house_bank,
    } = req.body;


    console.log(req.body);
    try {
    // return res.error(invoice);
        await DB.poolConnect;
        const request = DB.pool.request();
        let sqlgetrole = `SELECT nama FROM m_user_role_v WHERE m_user_id='${m_user_id}'`;
        let datarole = await request.query(sqlgetrole);
        let rolename = datarole.recordset.length > 0 ? datarole.recordset[0].nama : 'SYSTEM';


        let sqlgetklaim = `SELECT kode_status FROM klaim WHERE klaim_id = '${klaim_id}'`;
        let dataklaim = await request.query(sqlgetklaim);
        let kodeStatusExisting = dataklaim.recordset.length > 0 ? dataklaim.recordset[0].kode_status : null;
        

        if(kodeStatusExisting=='DIRC1'){

            let kodeStatus = 'DIRC2';
            let status = 'Approval KAM ,Waiting Approval Sales Head';

            let sqlupdate = `UPDATE klaim SET
            updatedby='${m_user_id}',
            kode_status = '${kodeStatus}',
            status='${status}'
            WHERE klaim_id='${klaim_id}'`;
            console.log(sqlupdate);
            await request.query(sqlupdate);


            let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
            await request.query(insertAudit);

        
            return res.success({
                message : 'Verifikasi Success'
            });

        }else if(kodeStatusExisting == 'DIRC2'){

            let kodeStatus = 'DIRC3';
            let status = 'Approval Sales Head, Waiting Serah Terima Dok.';


            let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
            await request.query(updateData);
    
            let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
            await request.query(insertAudit);
    
            return res.success({
                message: "Approve successfully",
            });
    
        }else if(kodeStatusExisting == 'MPD'){

            let status = 'Dok. Diterima Adm MI, Waiting Verifikasi';
            let kodeStatus = 'DTA';

            let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
            await request.query(updateData);
    
            let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
            await request.query(insertAudit);
    
            return res.success({
                message: "Approve successfully",
            });
    
        }else if(kodeStatusExisting == 'DTA'){

            let status = 'Dok. Terverifikasi, Waiting Approval RSM';
            let kodeStatus = 'DVS';

            let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
            await request.query(updateData);
    
            let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
            await request.query(insertAudit);
    
            return res.success({
                message: "Approve successfully",
            });
    
        }else if(kodeStatusExisting == 'DVS'){

            let status = 'Waiting Approval Sales Head';
            let kodeStatus = 'APR';

            let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
            await request.query(updateData);
    
            let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
            await request.query(insertAudit);
    
            return res.success({
                message: "Approve successfully",
            });
    
        }else if(kodeStatusExisting == 'APR'){

            let status = 'Approval Sales Head';
            let kodeStatus = 'APN';

            let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
            await request.query(updateData);
    
            let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
            await request.query(insertAudit);
    
            return res.success({
                message: "Approve successfully",
            });
    
        }else if(kodeStatusExisting == 'DAD'){

            let status = 'Dok Asli diterima ACC MI';
            let kodeStatus = 'TDF';

            let updateData = `UPDATE klaim set kode_status = '${kodeStatus}',
            status = '${status}',
            updated = getdate(),
            updatedby = '${m_user_id}'
            WHERE klaim_id = '${klaim_id}'`;
            await request.query(updateData);
    
            let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
            VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
            await request.query(insertAudit);
    
            return res.success({
                message: "Approve successfully",
            });
    
        }else if(kodeStatusExisting == 'TDF'){
            

          let kodeStatus = 'APF'
          let status = 'Waiting Plan Payment';
          let listActivity = [];
          let filename = undefined;
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
                fs.mkdirSync(dokumentPath("submitfaktur", klaim_id), {
                  recursive: true,
                });
                const filesamaDir = glob.GlobSync(
                  path.resolve(
                    dokumentPath("klaimproposal", klaim_id),
                    "file_ktp".replace(/\.[^/.]+$/, "")
                  ) + "*"
                );
                if (filesamaDir.found.length > 0) {
                  fs.unlinkSync(filesamaDir.found[0]);
                }
                fs.renameSync(
                  file.fd,
                  path.resolve(
                    dokumentPath("klaimproposal", klaim_id),
                    "file_ktp" + getExtOnly(file.filename) /*'file_po'*/
                  )
                );
                filename = "file_ktp" + getExtOnly(file.filename);
              }

              try {
                let setNamaKtp = ``;
                if (nama_ktp && nama_ktp != "null" && nama_ktp != "undefined") {
                  let namaktp = nama_ktp;
                  namaktp = namaktp
                    .replace(/'/g, `''`)
                    .replace(/"/g, `""`)
                    .replace(/\\/g, `\\`);
                  namaktp = `'${namaktp}'`;

                  setNamaKtp = `, nama_ktp = ${namaktp} `;
                } else {
                  setNamaKtp = `, nama_ktp = NULL`;
                }

                let setNomorKtp = ``;
                if (nomor_ktp && nomor_ktp != "null" && nomor_ktp != "undefined") {
                  let nomorktp = nomor_ktp;
                  nomorktp = nomorktp
                    .replace(/'/g, `''`)
                    .replace(/"/g, `""`)
                    .replace(/\\/g, `\\`);
                  nomorktp = `'${nomorktp}'`;

                  setNomorKtp = `, nomor_ktp = ${nomorktp} `;
                } else {
                  setNomorKtp = `, nomor_ktp = NULL`;
                }
                console.log('SAMPE SINI');

                let setFileKtp = ``;
                if (filename && filename != "null" && filename != "undefined") {
                  setFileKtp = `, file_ktp = '${filename}'`;
                } else {
                  setFileKtp = `,file_ktp = NULL`;
                }

                let glid = ``;
                if (r_gl_id && r_gl_id != "null") {
                  glid = `, r_gl_id = '${r_gl_id}'`;
                } else {
                  glid = `, r_gl_id = NULL`;
                }

                let rpartnerbankkeyid = ``;
                if (r_partner_bank_key_id && r_partner_bank_key_id !== "null") {
                  rpartnerbankkeyid = `, r_partner_bank_key_id = '${r_partner_bank_key_id}'`;
                } else {
                  rpartnerbankkeyid = `, r_partner_bank_key_id = NULL`;
                }

                let rpaymenttermklaimid = ``;
                if (r_payment_term_klaim_id && r_payment_term_klaim_id !== "null") {
                  rpaymenttermklaimid = `, r_payment_term_klaim_id = '${r_payment_term_klaim_id}'`;
                } else {
                  rpaymenttermklaimid = `, r_payment_term_klaim_id = NULL`;
                }

                  let notedqu = ``;
                  if(noted && noted!='' && noted!='null'){
                    notedqu = `, noted = '${noted}'`;
                  }else{
                    notedqu = `, noted = NULL`;
                  }
                  

                let valuegl = ``;
                if (value_gl && value_gl != "null") {
                  valuegl = `, value_gl = ${value_gl}`;
                } else {
                  valuegl = `, value_gl = 0`;
                }

                let arid = ``;
                if (r_ar_id && r_ar_id != "null") {
                  arid = `, r_ar_id = '${r_ar_id}'`;
                } else {
                  arid = `, r_ar_id = NULL`;
                }

                let valuear = ``;
                if (value_ar && value_ar != "null") {
                  valuear = `, value_ar = ${value_ar}`;
                } else {
                  valuear = `, value_ar = 0`;
                }

                let nilaipph = ``;
                if (pph) {
                  nilaipph = `, pph = ${pph}`;
                } else {
                  nilaipph = `, pph = 0`;
                }

                let nilaiopsionalpph = ``;
                if (opsional_pph) {
                  nilaiopsionalpph = `, opsional_pph = ${opsional_pph}`;
                } else {
                  nilaiopsionalpph = `, opsional_pph = 0`;
                }

                


                let rpajak = ``;
                if (r_pajak_id && r_pajak_id != "null") {
                  rpajak = `, r_pajak_id = '${r_pajak_id}'`;
                } else {
                  rpajak = `, r_pajak_id = NULL`;
                }

                let tanggalposting = ``;
                if (tanggal_posting && tanggal_posting != "null") {
                  tanggalposting = `, tanggal_posting = '${tanggal_posting}'`;
                } else {
                  tanggalposting = `, tanggal_posting = NULL`;
                }

                let r_bank_key = ``;
                if (r_house_bank && r_house_bank != "null") {
                  r_bank_key = `, r_house_bank = '${r_house_bank}'`;
                } else {
                  r_bank_key = `, r_house_bank = NULL`;
                }

                let setnama_npwp = ``;
                if (nama_npwp && nama_npwp != "null" && nama_npwp != "undefined") {
                  let namanpwp = nama_npwp;
                  namanpwp = namanpwp
                    .replace(/'/g, `''`)
                    .replace(/"/g, `""`)
                    .replace(/\\/g, `\\`);
                  namanpwp = `'${namanpwp}'`;

                  setnama_npwp = `, nama_npwp = ${namanpwp} `;
                } else {
                  setnama_npwp = `, nama_npwp = NULL `;
                }

                let setnomor_npwp = ``;
                if (
                  nomor_npwp &&
                  nomor_npwp != "null" &&
                  nomor_npwp != "undefined"
                ) {
                  let nomornpwp = nomor_npwp;
                  nomornpwp = nomornpwp
                    .replace(/'/g, `''`)
                    .replace(/"/g, `""`)
                    .replace(/\\/g, `\\`);
                  nomornpwp = `'${nomornpwp}'`;

                  setnomor_npwp = `, nomor_npwp = ${nomornpwp} `;
                } else {
                  setnomor_npwp = `, nomor_npwp = NULL `;
                }

                let settanggal_faktur_pajak = ``;
                if (
                  tanggal_faktur_pajak &&
                  tanggal_faktur_pajak != "null" &&
                  tanggal_faktur_pajak != "undefined"
                ) {
                  settanggal_faktur_pajak = `, tanggal_faktur_pajak = '${tanggal_faktur_pajak}' `;
                } else {
                  settanggal_faktur_pajak = `, tanggal_faktur_pajak = NULL `;
                }

                let setnomor_faktur;
                if (
                  nomor_faktur &&
                  nomor_faktur != "null" &&
                  nomor_faktur != "undefined"
                ) {
                  let nomorfaktur = nomor_faktur;
                  nomorfaktur = nomorfaktur
                    .replace(/'/g, `''`)
                    .replace(/"/g, `""`)
                    .replace(/\\/g, `\\`);
                  nomorfaktur = `'${nomorfaktur}'`;

                  setnomor_faktur = `, nomor_faktur = ${nomorfaktur} `;
                } else {
                  setnomor_faktur = `, nomor_faktur = NULL `;
                }


                let cekPlossa = `SELECT COUNT(1) AS jumlah_record FROM klaim_detail kd WHERE (brand='PLOSS' OR brand='PLOSSA') AND kd.klaim_id = '${klaim_id}'`;
                let dataplosa = await request.query(cekPlossa);
                let plosa = dataplosa.recordset[0].jumlah_record;

                if (plosa > 0) {
                  let cekar = `SELECT * FROM r_ar WHERE kode='1151041001'`;
                  let dataar = await request.query(cekar);
                  let ar = dataar.recordset[0].r_ar_id;
                  arid = `, r_ar_id = '${ar}'`;
                }



                let sql = `UPDATE klaim SET updated=getdate(),
                  updatedby = '${m_user_id}',
                  kode_status='${kodeStatus}',
                  status='${status}',
                  invoice = '${invoice}',
                  reason=NULL,
                  nominal_claimable = ${nominal_claimable}
                  ${tanggalposting}
                  ${nilaipph}
                  ${glid}
                  ${valuegl}
                  ${arid}
                  ${valuear}
                  ${setNamaKtp} 
                  ${setNomorKtp} 
                  ${setnama_npwp}
                  ${setnomor_npwp}
                  ${setnomor_faktur}
                  ${settanggal_faktur_pajak}
                  ${setFileKtp}
                  ${rpartnerbankkeyid}
                  ${rpaymenttermklaimid}
                  ${nilaiopsionalpph}
                  ${notedqu}
                  ${rpajak}
                  ${r_bank_key}
                  WHERE klaim_id='${klaim_id}'`;

                console.log("QUERY UPDATE : ",sql);

                request.query(sql, async (err, result) => {
                  if (err) {
                    return res.error(err);
                  }

                  let queryDataTableKlaim = `SELECT kl.klaim_id, kl.isactive, kl.created, kl.createdby, kl.updated, kl.updatedby,
                    kl.proposal_id, kl.nomor_proposal, kl.nomor_klaim, kl.title, kl.date_prop, kl.company, kl.region, kl.status,
                    kl.file_invoice, kl.file_surat_klaim_sesuai_prinsiple, kl.file_faktur_pajak, kl.file_eproposal,
                    kl.file_ktp, kl.file_rekap_klaim, kl.file_copy_faktur, kl.file_skp, kl.nomor_ktp, kl.nama_ktp,
                    kl.nomor_npwp, kl.nama_npwp, kl.nomor_faktur, kl.tipe_pajak, kl.tanggal_faktur_pajak,kl.tanggal_posting,kl.r_pajak_id,
                    kl.company_list AS company_code, kl.total_klaim, kl.nominal_pajak,
                    kl.nominal_claimable, kl.perihal_klaim, kl.kode_status,kl.tanggal_invoice,kl.value_gl,
                    mdv.r_organisasi_id,mdv.kode AS kode_pajak,ro.nama,kl.divisi,kl.reason,kl.r_gl_id,kl.r_costcenter_id,kl.r_ar_id,kl.value_ar,kl.pph,
                    kl.r_partner_bank_key_id,kl.r_payment_term_klaim_id,kl.sales_approve_amount,kl.asdh_approve_amount,kl.m_distributor_id,
                    kl.accounting_document_number,kl.fiscal_year,kl.opsional_pph,kl.noted,kv.r_distribution_channel_id
                    FROM klaim kl
                    LEFT JOIN  m_pajak mdv ON(mdv.m_pajak_id = kl.m_pajak_id)
                    LEFT JOIN  klaim_v kv ON(kv.klaim_id = kl.klaim_id)
                    LEFT JOIN  r_organisasi ro ON(ro.r_organisasi_id = mdv.r_organisasi_id)
                    WHERE kl.klaim_id = '${klaim_id}'`;

                  let queryDataTableKlaimDetail = `SELECT *
                    FROM klaim_detail WHERE klaim_id = '${klaim_id}'`;

                  let data_klaim = await request.query(queryDataTableKlaim);
                  let klaim = data_klaim.recordset[0];
                  //let kode_pajak = data_klaim.recordset[0].kode_pajak;
                  //let nomor_proposal = data_klaim.recordset[0].nomor_proposal;
                  let nomor_klaim = data_klaim.recordset[0].nomor_klaim;
                  let tanggal_invoice = data_klaim.recordset[0].tanggal_invoice;
                  let r_distribution_channel_id =
                    data_klaim.recordset[0].r_distribution_channel_id;
                  let m_distributor_id = data_klaim.recordset[0].m_distributor_id;
                  let sales_approve_amount =
                    data_klaim.recordset[0].sales_approve_amount;
                  let total_klaim = data_klaim.recordset[0].total_klaim;

                  let data_klaimdetail = await request.query(
                    queryDataTableKlaimDetail
                  );
                  let klaimdetail = data_klaimdetail.recordset;

                  klaim.lines = klaimdetail;
                  let region_desc = klaimdetail[0].region_id;
                  let sqlgetregionid = `SELECT * FROM r_region WHERE kode = '${region_desc}'`;
                  let dataregion = await request.query(sqlgetregionid);
                  let nama_region = dataregion.recordset[0].nama;
                  let r_region_id = dataregion.recordset[0].r_region_id;

                  klaim.nama_region = nama_region;

                  let getdataemail =
                    await request.query(`SELECT email_verifikasi FROM email_klaim 
                    WHERE r_distribution_channel_id='${r_distribution_channel_id}' AND r_region_id='${r_region_id}'  AND isemail_klaim = 'Y'`);

                  let dataemail = [];
                  for (let i = 0; i < getdataemail.recordset.length; i++) {
                    dataemail.push(getdataemail.recordset[i].email_verifikasi);
                  }

                  let getdataemail2 = await request.query(
                    `SELECT * FROM email_distributor WHERE tipe = 'KLAIM' AND m_distributor_id='${m_distributor_id}'`
                  );

                  for (let i = 0; i < getdataemail2.recordset.length; i++) {
                    dataemail.push(getdataemail2.recordset[i].email_verifikasi);
                  }

                  let listActivityUnique = _.uniq(listActivity);
                  dataemail = _.uniq(dataemail);
                  const amountKlaim = numeral(nominal_claimable)
                    .format("0,0")
                    .replace(/,/g, ".");

                  let sqlgetdistributor = `SELECT * FROM m_distributor_v mdv WHERE mdv.m_distributor_id = '${m_distributor_id}'`;
                  let datadistributor = await request.query(sqlgetdistributor);
                  let nama_pemohon = "";
                  if (datadistributor.length > 0) {
                    nama_pemohon = datadistributor.recordset[0].nama;
                  }

                  if (dataemail.length > 0) {
                    const param = {
                      subject: "Approve Klaim Proposal",
                      nomor_proposal: nomor_klaim,
                      activity: listActivityUnique.toString(),
                      distributor: nama_pemohon,
                      tanggal_pengajuan: tanggal_invoice,
                      nominal_klaim: `Rp. ${total_klaim}`,
                      nominal_approve: `Rp. ${sales_approve_amount}`,
                    };

                    let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
                    let datastatusIntegasi = await request.query(
                      sqlgetstatusIntegasi
                    );
                    let statusIntegasi =
                      datastatusIntegasi.recordset.length > 0
                        ? datastatusIntegasi.recordset[0].status
                        : "DEV";

                    if (statusIntegasi == "DEV") {
                      dataemail = [];
                      dataemail.push("tiasadeputra@gmail.com");
                    }

                    const template = await sails.helpers.generateHtmlEmail.with({
                      htmltemplate: "klaimproposal",
                      templateparam: param,
                    });
                    SendEmail(dataemail.toString(), param.subject, template);
                  }

                  let insertAudit = `INSERT INTO audit_klaim (klaim_id,m_user_id,rolename,status) 
                  VALUES ('${klaim_id}','${m_user_id}','${rolename}','${status}')`;
                  await request.query(insertAudit);

                  return res.success({
                      message: "Approve successfully",
                  });
                });
              } catch (err) {
                return res.error(err);
              }
            });
        }else{

            return res.error({
                message : 'Approve atau verifikasi gagal'
            });

        }

    } catch (err) {
        return res.error(err);
    }
      
  },
  new: async function (req, res) {
    const {
      m_direct_outlet_id,
      m_user_id,
      proposal_id,
      nomor_proposal,
      nomor_klaim,
      title,
      date_prop,
      company,
      region,
      r_costcenter_id,
      profit_center,
      file_invoice,
      file_surat_klaim_sesuai_prinsiple,
      file_faktur_pajak,
      file_eproposal,
      file_ktp,
      file_rekap_klaim,
      file_copy_faktur,
      file_skp,
      jenis_klaim,
      nomor_ktp,
      nama_ktp,
      nomor_npwp,
      nama_npwp,
      nomor_faktur,
      tipe_pajak,
      tanggal_faktur_pajak,
      company_code,
      company_list,
      total_klaim,
      nominal_pajak,
      nominal_claimable,
      perihal_klaim,
      tanggal_invoice,
      divisi,
      m_distributor_id,
      invoice,
      periode_klaim,
      file_program,
      lines,
    } = JSON.parse(req.body.document);

    await DB.poolConnect;
    const request = DB.pool.request();
    let totalKlaim = 0;
    let budget = [];


    console.log("cekk dskmdka");
    for (let i = 0; i < lines.length; i++) {
      let databudget = {
        nomor_proposal: lines[i].nomor_proposal,
        budget_awal_bgt: lines[i].budget_awal_bgt,
      };
      totalKlaim = totalKlaim + lines[i].total_klaim;

      budget.push("MASUK GAKKK ", databudget);
    }

    let uniqueBudget = _.uniqBy(budget, "nomor_proposal");
    //console.log(uniqueBudget);
    let totalBudgetAwal = 0;
    let dataklaimterpakai = 0;
    let budgetTerakhir = 0;
    let totalSisaKlaim = 0;
    for (let i = 0; i < uniqueBudget.length; i++) {
      let nomor_proposal = uniqueBudget[i].nomor_proposal;
      totalBudgetAwal = totalBudgetAwal + uniqueBudget[i].budget_awal_bgt;

      let cekbudget = `SELECT nomor,klaim FROM sisa_klaim WHERE nomor = '${nomor_proposal}'`;
      let getKlaimSAP = await request.query(cekbudget);
      let dataSAP = getKlaimSAP.recordset;

      if (dataSAP.length > 0) {
        budgetTerakhir = dataSAP[0].klaim;
      }

      let sqlHasKlaim = `SELECT
      kd.budget_id, kd.branch_code, kd.branch_desc, kd.activity, kd.brand,
      SUM(CASE WHEN k.kode_status='DR' THEN kd.total_klaim WHEN k.kode_status='RJF' THEN 0 ELSE kd.accounting_amount END) AS budget_terpakai, 
      kd.activity_code,
      kd.nomor_proposal, kd.divisi, kd.cost_center, 
      kd.profit_center, kd.region_id, kd.company_code, kd.date_prop, kd.comp_id, kd.title
      FROM klaim_detail kd,klaim k WHERE k.klaim_id = kd.klaim_id
      AND kd.nomor_proposal='${nomor_proposal}' AND k.kode_status <> 'RJF'
      AND k.isactive= 'Y'
      GROUP BY
      kd.budget_id, kd.branch_code, kd.branch_desc, kd.activity, kd.brand,
      kd.activity_code,
      kd.nomor_proposal, kd.divisi, kd.cost_center, 
      kd.profit_center, kd.region_id, kd.company_code, kd.date_prop, kd.comp_id, kd.title`;

      let getdatahasklaim = await request.query(sqlHasKlaim);
      dataklaimterpakai =
        getdatahasklaim.recordset.length > 0
          ? getdatahasklaim.recordset[0].budget_terpakai
          : 0;
    }
    totalSisaKlaim =
      totalBudgetAwal - totalKlaim - dataklaimterpakai - budgetTerakhir;

    // console.log('totalKlaim ',totalKlaim);
    // console.log('totalBudgetAwal ',totalBudgetAwal);
    // console.log('budgetTerakhirDariSAP ',budgetTerakhir);
    // console.log('dataklaimterpakai ',dataklaimterpakai);
    // console.log('totalSisaKlaim ',totalSisaKlaim);

    let message = `Budget tidak mencukupi untuk diklaim 
                  Budget Awal : ${totalBudgetAwal} - 
                  Total Klaim : ${totalKlaim} - 
                  Klaim Terpakai(E-Sales) : ${dataklaimterpakai} - 
                  Klaim terpakai (SAP) : ${budgetTerakhir}
                  Sisa Klaim = ${totalSisaKlaim}`;

    // let cekOutlet = `SELECT * FROM outlet_klaim WHERE kode_alias = '${m_user_id}'`;
    // let dcek = await request.query(cekOutlet);
    // if(dcek.recordset.length > 0){
    //     console.log(cekOutlet);
    // }

    // return  res.error("xxxxxxxxx");

    if (totalSisaKlaim < 0) {
      //console.log('zz', message);
      //perlakukan sebagaimana mestinya formdata, meski ujung2nya return error,
      var uploadFile = req.file("file");
      uploadFile.upload({}, async function onUploadComplete(err, files) {
        return res.error({
          message: message,
        });
      });
    } else {
      const generatedID = uuid();
      var uploadFile = req.file("file");
      //console.log(uploadFile);
      uploadFile.upload(
        { maxBytes: 500000000000000 },
        async function onUploadComplete(err, files) {
          if (err) {
            let errMsg = err.message;
            //console.log(errMsg);
            let sqllog = `INSERT INTO log_error
                  (createdby,updatedby, error,menu,klaim_id)
                  VALUES('${m_user_id}','${m_user_id}', '${err}','KLAIM','${generatedID}')`;
            await request.query(sqllog);

            let sqlupdateKlaim = `UPDATE klaim
                  SET isactive='N',updated=getdate() WHERE klaim_id='${generatedID}'`;
            await request.query(sqlupdateKlaim);

            return res.error(errMsg);
          }

          for (const file of files) {
            //console.log('filename', file.filename)
            fs.mkdirSync(dokumentPath("klaimproposal", generatedID), {
              recursive: true,
            });

            const filesamaDir = glob.GlobSync(
              path.resolve(
                dokumentPath("klaimproposal", generatedID),
                file.filename.replace(/\.[^/.]+$/, "")
              ) + "*"
            );
            if (filesamaDir.found.length > 0) {
              //console.log('isexist file nama sama', filesamaDir.found[0])
              fs.unlinkSync(filesamaDir.found[0]);
            }
            fs.renameSync(
              file.fd,
              path.resolve(
                dokumentPath("klaimproposal", generatedID),
                file.filename
              )
            );
          }

          // ++++++++++++++++++++
          //  kode insert ke db |
          // ++++++++++++++++++++

          try {
            console.log("TEST");
            if (m_distributor_id == null) {
              console.log("MASUK MENU DIRECT OUTLET");
              console.log("m_direct_outlet_id : ", m_direct_outlet_id);
              let cekDirectOutlet = `SELECT * FROM m_direct_outlet mdo WHERE m_direct_outlet_id = '${m_direct_outlet_id}'`;
              let datadiroutid = await request.query(cekDirectOutlet);
              console.log(cekDirectOutlet);

              let kode_vendor = datadiroutid.recordset[0].kode_vendor;
              console.log(kode_vendor, "kode vendor");

              let perihalklaim = ``;
              if (perihal_klaim) {
                perihalklaim = perihal_klaim;
                perihalklaim = perihalklaim
                  .replace(/'/g, `''`)
                  .replace(/"/g, `""`)
                  .replace(/\\/g, `\\`);
                perihalklaim = `'${perihalklaim}'`;
              } else {
                perihalklaim = `NULL`;
              }

              let tanggalfakturpajak = ``;
              if (tanggal_faktur_pajak) {
                tanggalfakturpajak = `'${tanggal_faktur_pajak}'`;
              } else {
                tanggalfakturpajak = `NULL`;
              }

              let sqlgetdocumentno = `SELECT document_number_id FROM document_number WHERE kode = 'KLAIM'`;

              let getdocument = await request.query(sqlgetdocumentno);
              let document_number_id =
                getdocument.recordset.length > 0
                  ? getdocument.recordset[0].document_number_id
                  : "";

              //let queryDataTable = `SELECT TOP 1 nomor_klaim FROM klaim WHERE m_pajak_id='${m_pajak_id}' ORDER BY nomor_klaim DESC`;
              let queryDataTable = `SELECT COUNT(1) AS nomor_klaim FROM klaim k`;
              let getsequence = await request.query(queryDataTable);
              const row = getsequence.recordset[0];
              //let linenumber = getsequence.recordset.length > 0 ? (Number(row.nomor_klaim.split('/')[4]) + 1000) : 1000;
              let linenumber = row.nomor_klaim;
              let totalrows = pad(linenumber);
              let bulan = moment().format("MMM");
              let tahun = moment().format("YYYY");

              let file_invoice_text = file_invoice && file_invoice!='null' && file_invoice!='' ? `'${file_invoice}'` : 'NULL';
              let file_eproposal_text = file_eproposal && file_eproposal!='null' && file_eproposal!='' ? `'${file_eproposal}'` : 'NULL';
              let file_ktp_text = file_ktp && file_ktp!='null' && file_ktp!='' ? `'${file_ktp}'` : 'NULL';
              let file_rekap_klaim_text = file_rekap_klaim && file_rekap_klaim!='null' && file_rekap_klaim!='' ? `'${file_rekap_klaim}'` : 'NULL';
              let file_skp_text = file_skp && file_skp!='null' && file_skp!='' ? `'${file_skp}'` : 'NULL';
              let file_faktur_pajak_text = file_faktur_pajak && file_faktur_pajak!='null' && file_faktur_pajak!='' ? `'${file_faktur_pajak}'` : 'NULL';
              let file_copy_faktur_text = file_copy_faktur && file_copy_faktur!='null' && file_copy_faktur!='' ? `'${file_copy_faktur}'` : 'NULL';
              let file_surat_klaim_sesuai_prinsiple_text = file_surat_klaim_sesuai_prinsiple && file_surat_klaim_sesuai_prinsiple!='null' && file_surat_klaim_sesuai_prinsiple!='' ? `'${file_surat_klaim_sesuai_prinsiple}'` : 'NULL';
              let file_program_text = file_program && file_program!='null' && file_program!='' ? `'${file_program}'` : 'NULL';

            

              let nomor_ktp_text = nomor_ktp && nomor_ktp!='null' && nomor_ktp!='' ? `'${nomor_ktp}'` : 'NULL';
              let nama_ktp_text = nama_ktp && nama_ktp!='null' && nama_ktp!='' ? `'${nama_ktp}'` : 'NULL';
              let nomor_npwp_text = nomor_npwp && nomor_npwp!='null' && nomor_npwp!='' ? `'${nomor_npwp}'` : 'NULL';
              let nama_npwp_text = nama_npwp && nama_npwp!='null' && nama_npwp!='' ? `'${nama_npwp}'` : 'NULL';
              let nomor_faktur_text = nomor_faktur && nomor_faktur!='null' && nomor_faktur!='' ? `'${nomor_faktur}'` : 'NULL';
              let invoice_text = invoice && invoice!='null' && invoice!='' ? `'${invoice}'` : 'NULL';
              let periode_klaim_text = periode_klaim && periode_klaim!='null' && periode_klaim!='' ? `'${periode_klaim}'` : 'NULL';



              let nomor_dokumen_klaim =
                tahun +
                "/DO/PROP/" +
                bulan.toLocaleUpperCase() +
                "/" +
                kode_vendor +
                "/" +
                totalrows;
              console.log(nomor_dokumen_klaim);

              let status = `Pengajuan, Waiting Approval KAM`;
              let kode_status = `DIRC1`;
              console.log(generatedID, "generateId");
              let sql = `INSERT INTO klaim
                (klaim_id,
                createdby,
                updatedby,
                nomor_klaim, 
                status,
                file_invoice, 
                file_surat_klaim_sesuai_prinsiple, 
                file_eproposal, 
                file_ktp, 
                file_rekap_klaim, 
                file_skp, 
                file_faktur_pajak,
                file_copy_faktur,
                nomor_ktp, 
                nama_ktp, 
                nomor_npwp, 
                nama_npwp, 
                nomor_faktur, 
                tipe_pajak, 
                tanggal_faktur_pajak, 
                company_list, 
                total_klaim,
                asdh_approve_amount,
                sales_approve_amount,
                accounting_approve_amount,
                nominal_pajak, 
                nominal_claimable, 
                perihal_klaim, 
                kode_status,
                tanggal_invoice,
                m_direct_outlet_id,
                invoice,
                jenis_klaim,
                periode_klaim,
                file_program
                )
                VALUES(
                    '${generatedID}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${nomor_dokumen_klaim}',
                    '${status}',
                    ${file_invoice_text},
                    ${file_surat_klaim_sesuai_prinsiple_text},
                    ${file_faktur_pajak_text},
                    ${file_copy_faktur_text},
                    ${file_eproposal_text},
                    ${file_ktp_text},
                    ${file_rekap_klaim_text},   
                    ${file_skp_text},
                    ${nomor_ktp_text},
                    ${nama_ktp_text},
                    ${nomor_npwp_text},
                    ${nama_npwp_text},
                    ${nomor_faktur_text},
                    '${tipe_pajak}',
                    ${tanggalfakturpajak},
                    'MI',
                    ${total_klaim},
                    ${total_klaim},
                    ${total_klaim},
                    ${total_klaim},
                    '${nominal_pajak}', 
                    '${nominal_claimable}', 
                    ${perihalklaim}, 
                    '${kode_status}',
                    '${tanggal_invoice}',
                    '${m_direct_outlet_id}',
                    ${invoice_text},
                    '${jenis_klaim}',
                    ${periode_klaim_text},
                    ${file_program_text}
                )`;
              console.log(sql, "sql");

              //  =========================

              console.log("TEST II");

              // let sql;
              request.query(sql, async (err, result) => {
                // try {
                console.log("ERR");
                if (err) {

                  console.log(err.RequestError);
                  return res.error({
                    message : err.toString()
                  });
                }
                console.log("MASUK");

                let listActivity = [];
                let totalKlaimHeader = 0;
                for (let i = 0; i < lines.length; i++) {
                  totalKlaimHeader =
                    totalKlaimHeader + Number(lines[i].total_klaim);
                  let budget_id = lines[i].budget_id;
                  let branch_code = lines[i].branch_code;
                  let branch_desc = lines[i].branch_desc;
                  let activity = lines[i].activity;
                  let activity_code = lines[i].activity_code;
                  let brand = lines[i].brand.replace(/'/g, "");
                  let budget = Number(lines[i].budget);
                  let budget_awal_bgt = Number(lines[i].budget_awal_bgt);
                  let total_klaim = Number(lines[i].total_klaim);
                  let outstanding_klaim = Number(lines[i].outstanding_klaim);
                  let ischecked = lines[i].ischecked;
                  let nomor_proposal = lines[i].nomor_proposal;
                  let comp_id = lines[i].comp_id;
                  let company_code = lines[i].company;
                  let title = lines[i].title.replace(/'/g, "");
                  let region = lines[i].region;
                  console.log(region, "region");
                  let date_prop = lines[i].date_prop;
                  let profitcenter = lines[i].profitcenter;
                  let divisi = lines[i].divisi;
                  console.log(divisi, "divisi");
                  let cost_center = lines[i].cost_center;

                  console.log(ischecked, "ischecked");
                  console.log(generatedID, "generateId detail");
                  if (ischecked && total_klaim > 0) {
                    console.log("INSERT DETAIL NIH ... ");
                    let queryInsertLines = `INSERT INTO klaim_detail
                            (createdby, updatedby, klaim_id, budget_id, branch_code, 
                            branch_desc, activity, brand, budget,total_klaim,outstanding_klaim,
                            activity_code,nomor_proposal,
                            asdh_amount,
                            sales_amount,
                            accounting_amount,
                            divisi,
                            cost_center,
                            profit_center,
                            region_id,
                            company_code,
                            date_prop,
                            comp_id,
                            title,
                            budget_awal
                            )
                            VALUES('${m_user_id}','${m_user_id}', '${generatedID}', 
                            '${budget_id}', '${branch_code}', '${branch_desc}', 
                            '${activity}', '${brand}', ${budget},${total_klaim},${outstanding_klaim},
                            '${activity_code}','${nomor_proposal}',
                            ${total_klaim},
                            ${total_klaim},
                            ${total_klaim},
                            '${divisi}',
                            '${cost_center}',
                            '${profitcenter}',
                            '${region}',
                            '${company_code}',
                            '${date_prop}',
                            '${comp_id}',
                            '${title}',
                            ${budget_awal_bgt}
                            )`;
                    // console.log(queryInsertLines, "insert detail");
                    await request.query(queryInsertLines);
                    listActivity.push(activity);

                    // PROSES DELETE LOCK PROSES KLAIM
                    let sqlDeleteDataLockKlaim = `DELETE FROM lock_eprop_klaim 
                            WHERE nomor_proposal = '${nomor_proposal}' AND m_user_id = '${m_user_id}'`;
                    await request.query(sqlDeleteDataLockKlaim);
                  }
                }

                // insert notifikasi
                // let user_klaim = `SELECT * FROM m_role_sales mrs WHERE kode_region = '${kode_region_}'`;
                // let res_ = await request.query(user_klaim);
                // res_ = res_.recordset;

                // // if (res_.length > 0) {
                // for (let z = 0; z < res_.length; z++) {
                // let m_user_id_ = res_[z].m_user_id;
                let insertnotify = `insert into notifikasi_klaim (klaim_id,kode_status,status,is_proses,createddate,updateddate,m_user_id)
                            VALUES ('${generatedID}','DIRC1','Pengajuan',0,getdate(),null,'${m_user_id}')`;

                console.log(insertnotify);
                await request.query(insertnotify);
                // }
                // }

                let nominalPajakHeader = 0;
                if (tipe_pajak == "PPN 10%") {
                  nominalPajakHeader = (totalKlaimHeader * 10) / 100;
                } else if (tipe_pajak == "PPN 11%") {
                  nominalPajakHeader = (totalKlaimHeader * 11) / 100;
                }

                //Memastikan nilai header sama dengan jumlah detail
                let totalNominalClaimableHeader =
                  totalKlaimHeader + nominalPajakHeader;
                let updateHeader = `UPDATE klaim SET total_klaim=${totalKlaimHeader},
                      nominal_pajak=${nominalPajakHeader},
                      nominal_claimable=${totalNominalClaimableHeader} WHERE klaim_id = '${generatedID}'`;
                //console.log(updateHeader);
                await request.query(updateHeader);

                let queryDataTableKlaim = `SELECT *
                      FROM klaim_direct_outlet_v kl 
                      WHERE kl.klaim_id ='${generatedID}'`;

                let queryDataTableKlaimDetail = `SELECT *
                      FROM klaim_detail WHERE klaim_id = '${generatedID}'`;

                let data_klaim = await request.query(queryDataTableKlaim);
                console.log("queryDataTableKlaim",queryDataTableKlaim);
                console.log("data_klaim",data_klaim.recordset[0]);
                let klaim = data_klaim.recordset[0];

                let data_klaimdetail = await request.query(
                  queryDataTableKlaimDetail
                );
                let klaimdetail = data_klaimdetail.recordset;
                klaim.lines = klaimdetail;
                let region_desc = klaimdetail[0].region_id;
                let sqlgetregionid = `SELECT * FROM r_region WHERE kode = '${region_desc}'`;
                let dataregion = await request.query(sqlgetregionid);

                let sqlgetregionidbydistributor = `SELECT * FROM r_region WHERE kode = '${klaim.kode_region}'`;
                let dataregionbydistributor = await request.query(
                  sqlgetregionidbydistributor
                );
                let nama_region =
                  dataregion.recordset.length > 0
                    ? dataregion.recordset[0].nama
                    : dataregionbydistributor.recordset.length > 0
                    ? dataregionbydistributor.recordset[0].nama
                    : "";
                let r_region_id =
                  dataregion.recordset.length > 0
                    ? dataregion.recordset[0].r_region_id
                    : klaim.kode_region;
                klaim.nama_region = nama_region;

                let r_distribution_channel_id =
                  "B1C029DC-8A20-45E3-AA13-8999A0E8452A";

                let getdataemail1 =
                  await request.query(`SELECT email_verifikasi FROM email_klaim 
                      WHERE r_distribution_channel_id='${r_distribution_channel_id}' AND r_region_id='${r_region_id}' AND role = 'SALES' AND isemail_klaim = 'Y'`);

                // console.log(`SELECT email_verifikasi FROM email_klaim
                // WHERE r_distribution_channel_id='${r_distribution_channel_id}' AND r_region_id='${r_region_id}' AND role = 'SALES' AND isemail_klaim = 'Y'`);
                let dataemail = [];

                let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
                let datastatusIntegasi = await request.query(
                  sqlgetstatusIntegasi
                );
                let statusIntegasi =
                  datastatusIntegasi.recordset.length > 0
                    ? datastatusIntegasi.recordset[0].status
                    : "DEV";

                if (statusIntegasi == "DEV") {
                  dataemail.push(["ilyas.nurrahman74@gmail.com"]);
                } else {
                  for (let i = 0; i < getdataemail1.recordset.length; i++) {
                    dataemail.push(getdataemail1.recordset[i].email_verifikasi);
                  }
                }
                //console.log(dataemail);
                
                /*// comment by fata 20231107
                let sqlget_org = `SELECT * FROM r_organisasi ro INNER JOIN m_direct_outlet mdo on ro.kode = mdo.kode_vendor WHERE mdo.m_direct_outlet_id = '${m_direct_outlet_id}'`;
                let exsql = await request.query(sqlget_org);
                let r_organisasi_id = exsql.recordset[0].r_organisasi_id;

                let nama_pemohon = exsql.recordset[0].nama;

                let insertDocumentNo = `INSERT INTO document_number_line
                      (document_number_id, r_organisasi_id, line)
                      VALUES('${document_number_id}','${r_organisasi_id}',${linenumber})`;
                //console.log(insertDocumentNo);
                await request.query(insertDocumentNo);
                */
                let insertKlaim = `INSERT INTO audit_klaim
                      (klaim_id, m_user_id, rolename, status)
                      VALUES('${generatedID}', '${m_user_id}', 'DISTRIBUTOR', 'Pengajuan')`;
                //console.log(insertKlaim);
                await request.query(insertKlaim);

                listActivity = _.uniq(listActivity);
                dataemail = _.uniq(dataemail);
                const amount = numeral(nominal_claimable)
                  .format("0,0")
                  .replace(/,/g, ".");

                if (dataemail.length > 0) {
                  const param = {
                    subject: "Klaim Proposal",
                    nomor_proposal: nomor_proposal,
                    activity: listActivity.toString(),
                    // distributor: nama_pemohon, // comment by fata 20231107
                    tanggal_pengajuan: tanggal_invoice,
                    nominal_klaim: `Rp. ${amount}`,
                  };
                }

                return res.success({
                  data: klaim,
                  message: "Insert data successfully",
                });
              });
            }
          } catch (err) {
            console.log("MASUKKK CATCH ERR");
            let sqllog = `INSERT INTO log_error
                  (createdby,updatedby, error,menu,klaim_id)
                  VALUES('${m_user_id}','${m_user_id}', '${err}','KLAIM','${generatedID}')`;
            await request.query(sqllog);
            console.log(sqllog, "sqllog");

            let sqlupdateKlaim = `UPDATE klaim
                  SET isactive='N', updated=getdate() WHERE klaim_id='${generatedID}'`;
            await request.query(sqlupdateKlaim);
            return res.error(err);
          }
        }
      );
    }
  },
  approvals: async function (req, res) {
    const { m_user_id, klaim_id } = req.body;
    await DB.poolConnect;

    try {
      console.log("MASUKK yas !!");
      // await DB.poolConnect;
      const request = DB.pool.request();
      let sqlklaim = `SELECT * FROM klaim k WHERE klaim_id='${klaim_id}'`;
      console.log("sqlklaim : ", sqlklaim);
      let getklaim = await request.query(sqlklaim);
      // let klaimdata = getklaim.recordset;

      let kode_status = getklaim.recordset[0].kode_status;
      let status = getklaim.recordset[0].status;

      console.log(kode_status, "kode status");
      console.log(status, "status");

      // ===================
      //  validasi approval|
      // ===================

      if (kode_status == "DIRC1") {
        console.log("MASUK PROSES APPROVAL KAM"); // user kam
        let sqlRole = `SELECT * FROM m_user_role_v_new WHERE m_user_id='${m_user_id}' AND nama='KAM'`;
        let getrole = await request.query(sqlRole);

        getrole = getrole.recordset;

        if (getrole.length == 0) {
          return res.error({
            message: `ANDA BELUM TERDAFTAR SEBAGAI KAM`,
          });
        } else {
          let rolename = getrole[0].nama;

          console.log("MASUK");

          let kode_status = "DIRC2";
          let status = "Waiting Approval Sales Head";

          //  update tabel klaim
          let sqlupdate = `UPDATE klaim SET updated = getdate(),createdby='${m_user_id}', kode_status = '${kode_status}', status='${status}' WHERE klaim_id='${klaim_id}'`;

          //  insert ke audit
          let addAudit = `insert into audit_klaim (klaim_id,m_user_id,rolename,status) VALUES ('${klaim_id}','${m_user_id}','${rolename}','Approve KAM,Waiting Approval Sales Head')`;
          console.log("addAudit : ", addAudit);

          await request.query(sqlupdate);
          console.log("SUKSES UPDATE");
          await request.query(addAudit);
          console.log("SUKSES INSERT");

          request.query(sqlupdate, (err, result) => {
            if (err) {
              return res.error(err);
            }

            return res.success({
              data: true,
              message: "Update data successfully",
            });
          });
        }
      } else if (kode_status == "DIRC2") {
        console.log("MASUK PROSES APPROVAL SALESHEAD"); // user kam
        let sqlRole = `SELECT * FROM m_user_role_v_new WHERE m_user_id='${m_user_id}' AND nama='SALESHO3'`;
        let getrole = await request.query(sqlRole);

        getrole = getrole.recordset;

        if (getrole.length == 0) {
          return res.error({
            message: `ANDA BELUM TERDAFTAR SEBAGAI SALESHEAD `,
          });
        } else {
          let rolename = getrole[0].nama;
          let kode_status = "DIRC3";
          let status = "Waiting Serah Terima Dok.";

          //  update tabel klaim
          let sqlupdate = `UPDATE klaim SET createdby='${m_user_id}', kode_status = '${kode_status}', status='${status}' WHERE klaim_id='${klaim_id}'`;
          await request.query(sqlupdate);

          //  insert ke audit
          let addAudit = `insert into audit_klaim (klaim_id,m_user_id,rolename,status) VALUES ('${klaim_id}','${m_user_id}','${rolename}','Approve Sales Head, Waiting Serah Terima Dok.')`;
          await request.query(addAudit);

          request.query(sqlupdate, (err, result) => {
            if (err) {
              return res.error(err);
            }
            return res.success({
              data: true,
              message: "Update data successfully",
            });
          });
        }
      }else{
        return res.error({
          message: `Gagal Approve ! `,
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  rejects: async function (req, res) {
    const { m_user_id, klaim_id,reason } = req.body;
    await DB.poolConnect;

    try {
      console.log("MASUK REJECT");

      const request = DB.pool.request();
      console.log("masukk..");

      // ===================
      //  get table klaim  |
      // ===================\

      let sqlklaim = `SELECT * FROM klaim k WHERE klaim_id='${klaim_id}'`;
      console.log("sqlklaim : ", sqlklaim);
      let getklaim = await request.query(sqlklaim);
      // let klaimdata = getklaim.recordset;

      let kode_status = getklaim.recordset[0].kode_status;
      let status = getklaim.recordset[0].status;

      console.log(kode_status, "kode status");
      console.log(status, "status");

      // =================
      //  validasi reject|
      // =================

      if (kode_status == "DIRC1") {
        console.log("MASUK PROSES REJECT KAM"); // user kam
        let sqlRole = `SELECT * FROM m_user_role_v WHERE m_user_id='${m_user_id}' AND nama='KAM'`;
        let getrole = await request.query(sqlRole);

        getrole = getrole.recordset;

        if (getrole.length == 0) {
          return res.error({
            message: `ANDA BELUM TERDAFTAR SEBAGAI KAM `,
          });
        } else {
          let rolename = getrole[0].nama;

          console.log("MASUK");

          let kode_status = "RJF";
          let status = "Reject By " + `${rolename}`;

          //  update tabel klaim
          let sqlupdate = `UPDATE klaim SET updated = getdate(),createdby='${m_user_id}', kode_status = '${kode_status}', status='${status}' WHERE klaim_id='${klaim_id}'`;

          //  insert ke audit
          let addAudit = `insert into audit_klaim (klaim_id,m_user_id,rolename,status) VALUES ('${klaim_id}','${m_user_id}','${rolename}','Reject By KAM')`;
          // console.log("addAudit : ", addAudit);

          await request.query(sqlupdate);
          console.log("SUKSES UPDATE");
          await request.query(addAudit);
          console.log("SUKSES INSERT");

          
          let insrjc = `insert into reject_klaim_log
          (klaim_id,m_user_id,createddate,alasan)
          VALUES ('${klaim_id}','${m_user_id}',getdate(),'${reason}')`;
            await request.query(insrjc);

          request.query(sqlupdate, (err, result) => {
            if (err) {
              return res.error(err);
            }

            return res.success({
              data: true,
              message: "Update data successfully",
            });
          });
        }
      } else if (kode_status == "DIRC2") {
        console.log("MASUK PROSES REJECT SALESHEAD"); // user kam
        let sqlRole = `SELECT * FROM m_user_role_v WHERE m_user_id='${m_user_id}' AND nama='SALESHO3'`;
        let getrole = await request.query(sqlRole);

        getrole = getrole.recordset;

        if (getrole.length == 0) {
          return res.error({
            message: `ANDA BELUM TERDAFTAR SEBAGAI SALESHEAD `,
          });
        } else {
          let rolename = getrole[0].nama;

          let kode_status = "RJF";
          let status = "Reject By" + `'${getrole}'`;

          //  update tabel klaim
          let sqlupdate = `UPDATE klaim SET createdby='${m_user_id}', kode_status = '${kode_status}', status='Reject By ${rolename}' WHERE klaim_id='${klaim_id}'`;
          await request.query(sqlupdate);

          console.log(sqlupdate, "sqlupdate");

          //  insert ke audit
          let addAudit = `insert into audit_klaim (klaim_id,m_user_id,rolename,status) VALUES ('${klaim_id}','${m_user_id}','${rolename}', 'Reject By SALESHEAD')`;
          await request.query(addAudit);

          request.query(sqlupdate, (err, result) => {
            if (err) {
              return res.error(err);
            }
            return res.success({
              data: true,
              message: "Update data successfully",
            });
          });
        }
      }
      else if (kode_status == "DAD") {
      console.log("MASUK PROSES REJECT ACCOUNTING"); // user kam
      let sqlRole = `SELECT * FROM m_user_role_v WHERE m_user_id='${m_user_id}' AND nama='ACCOUNTING2'`;
      let getrole = await request.query(sqlRole);

      getrole = getrole.recordset;

      if (getrole.length == 0) {
        return res.error({
          message: `ANDA BELUM TERDAFTAR SEBAGAI ACCOUNTING`,
        });
      } else {
        let rolename = getrole[0].nama;

        let kode_status = "RJF";
        let status = "Reject By" + `'${getrole}'`;

        //  update tabel klaim
        let sqlupdate = `UPDATE klaim SET createdby='${m_user_id}', kode_status = '${kode_status}', status='Reject By ${rolename}' WHERE klaim_id='${klaim_id}'`;
        await request.query(sqlupdate);

        console.log(sqlupdate, "sqlupdate");

        //  insert ke audit
        let addAudit = `insert into audit_klaim (klaim_id,m_user_id,rolename,status) VALUES ('${klaim_id}','${m_user_id}','${rolename}', 'Reject By ACCOUNTING')`;
        await request.query(addAudit);

        request.query(sqlupdate, (err, result) => {
          if (err) {
            return res.error(err);
          }
          return res.success({
            data: true,
            message: "Update data successfully",
          });
        });
      }
    }
      else{
        return res.error({
          message: `Gagal Reject ! `,
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  find: async function (req, res) {
    const {
      query: {
        currentPage,
        pageSize,
        m_user_id,
        searchText,
        periode,
        periode1,
        status,
        // m_pajak_v_id,
        // r_distribution_channel_id,
        // region_id,
        m_direct_outlet_id,
        jenis,
        filter,
      },
    } = req;
    console.log("LEMPARAN :", m_user_id, searchText, m_direct_outlet_id);

    console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";

      let bulan = parseInt(moment(periode, "YYYY-MM").format("MM"));
      let tahun = parseInt(moment(periode, "YYYY-MM").format("YYYY"));

      let WherePeriode = ``;
      if (periode && periode1) {
        WherePeriode = ` AND CONVERT(VARCHAR(10),kl.created,120) BETWEEN '${periode}' AND '${periode1}' `;
      }

      let whereJenis = ``;
      if (jenis) {
        whereJenis = ` AND kl.jenis_klaim = '${jenis}' `;
      }

      let whereDirectOutlet = ``;
      if (m_direct_outlet_id) {
        whereDirectOutlet = ` AND kl.m_direct_outlet_id = '${m_direct_outlet_id}'`;
      }

      let WhereStatus = ``;
      if (status) {
        WhereStatus = `AND kl.kode_status = '${status}'`;
      }

      console.log("MASUK DI PEMBENTUKAN KONDISI PENCARIAN");

      let rolename = "";
      if (m_user_id) {
        // *Pengen Validasi kalo KAM* //
        let sqlRoleKam = `SELECT * FROM m_user_role_v WHERE m_user_id='${m_user_id}' AND nama='KAM'`;
        let getroleKam = await request.query(sqlRoleKam);
        getroleKam = getroleKam.recordset;

        // *Pengen Validasi kalo SALESHEAD* //
        let sqlRoleHead = `SELECT * FROM m_user_role_v WHERE m_user_id='${m_user_id}' AND nama='SALESHO3'`;
        let getroleHead = await request.query(sqlRoleHead);
        getroleHead = getroleHead.recordset;

        if (getroleKam.length !== 0) {
          rolename = getroleKam[0].nama;
          console.log("ADA KAM ", rolename);
        } else if (getroleHead.length !== 0) {
          rolename = getroleHead[0].nama;
          console.log("ADA Head ", rolename);
        }
      }

      console.log("getrolenya ..", rolename);

      let whereClauseSearch = ``;
      if (searchText) {
        whereClauseSearch = `AND kl.nomor_proposal LIKE '%${searchText}%'
          OR kl.nomor_klaim LIKE '%${searchText}%' 
          OR kl.total_klaim LIKE '%${searchText}%'
          OR kl.accounting_document_number LIKE '%${searchText}%'
          OR kl.nama_outlet LIKE '%${searchText}%'
          `;
      }


      let SQLGetUserOutlet= `SELECT * FROM m_direct_outlet_view WHERE (m_user_id_kam = '${m_user_id}' or m_user_id_head = '${m_user_id}') `;
      let dataoutlet = await request.query(SQLGetUserOutlet);
      let outlet_id = dataoutlet.recordset.map(function (item) {
        return `'${item["m_direct_outlet_id"]}'`; // menambahkan tanda kutip pada setiap nilai
      });

      console.log("outlet_id : ",outlet_id);

      let whereOutletIn = '';
      if (Array.isArray(outlet_id) && outlet_id.length) {
        let outletIdList = outlet_id.join(','); // mengubah array menjadi string dengan delimiter koma
        whereOutletIn = ` AND m_direct_outlet_id IN (${outletIdList})`;
      } 

      console.log("whereOutletIn : ",whereOutletIn);

      let whereClauseStatusRegion = ``;
      // *PENYESUAIAN LIST YG DI DAPAT SESUAI ROLE Note : baru KAM & HEAD karna kode statusnya blum full * //
      if (rolename == "KAM") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DIRC1','DIRC2','DIRC3','VER','VERACC','APS','APR','APN','APF','SKP','PAY','RJF')`;
        //semua status pengajuan
      } else if (rolename == "SALESHO3") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DIRC2','DIRC3','VER','VERACC','APS','APR','APN','APF','SKP','PAY','RJF')`;
        //semua status pengajuan
      } else if (
        rolename == "SALESGTREGIONKLAIM" ||
        rolename == "SALEADMINFKR" ||
        rolename == "EXECUTOR-EPROP" ||
        rolename == "ADMIN-ERPOP" ||
        rolename == "APPROVAL-EPROP"
      ) {
        // whereClauseStatusRegion = `AND kl.kode_status IN ('DR','VER','VERACC','APS','APR','APN','APF','SKP','PAY','RJF')`;
        //semua status pengajuan
        whereClauseStatusRegion = ``;
      } else if (rolename == "RSDH") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DVS','APS','APR','APN','APF','SKP','PAY','TDF','VDP')`;
      } else if (rolename == "NSDH" || rolename == "SALESHO3") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DIRC2','DIRC3','APS','APR','APN','APF','SKP','PAY','TDF','VDP')`;
      } else if (rolename == "ACCOUNTING2") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('APN','DAD','VERACC','APF','SKP','PAY','VER','TDF')`;
        if (filter) {
          whereClauseStatusRegion = `AND kl.kode_status = '${filter}'`;
        }
      } else if (rolename == "ACCOUNTING") {
        whereClauseStatusRegion = `AND kl.kode_status IN ('DAD','APF','SKP','PAY')`;
        if (filter) {
          whereClauseStatusRegion = `AND kl.kode_status = '${filter}'`;
        }
      } else if (rolename == "DISTRIBUTOR") {
      } else {
        console.log("LANJUT TERUSS ");
      }

      console.log("SELESAI PROSES CEK ROLE");

      if (req.query.status) {
        whereClauseStatusRegion = `AND kl.kode_status IN ('${req.query.status}')`;
      }

      console.log("SELESAI PROSES CEK ROLE 2");
      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM klaim_direct_outlet_v kl 
                              WHERE 1=1 ${whereClause} ${whereClauseSearch} ${whereDirectOutlet}
                              ${whereClauseStatusRegion} ${WherePeriode}  ${WhereStatus} ${whereJenis} ${whereOutletIn}`;

                              console.log("queryCountTable : ",queryCountTable);
      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      console.log("count : ", count);

      console.log("MULAI MAU KE QUERY UTAMA ");
      let queryDataTable = `SELECT *
        FROM klaim_direct_outlet_v kl 
        WHERE 1=1 ${whereClause} ${whereClauseSearch} ${whereDirectOutlet}
        ${whereClauseStatusRegion} ${WherePeriode}  ${WhereStatus} ${whereJenis} ${whereOutletIn}
        ORDER BY kl.created DESC
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY`;

      console.log("count : ", queryCountTable);
      console.log("data :", queryDataTable);

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);

        //console.log("cxasda",rows);
        for (let i = 0; i < rows.length; i++) {
          let kode_region = rows[i].kode_region;
          rows[i].isopsipph = rows[i].opsional_pph > 0 ? true : false;
          let queryDataTableKlaimDetail = `SELECT *
              FROM klaim_detail WHERE klaim_id = '${rows[i].klaim_id}'`;

          //console.log(queryDataTableKlaimDetail);

          let data_klaimdetail = await request.query(queryDataTableKlaimDetail);
          let klaimdetail = data_klaimdetail.recordset;
          for (let j = 0; j < klaimdetail.length; j++) {
            let SqlgetBudgetTerpakai = `SELECT SUM(CASE WHEN k.kode_status='DR' THEN kd.total_klaim WHEN k.kode_status='RJF' THEN 0 ELSE kd.accounting_amount END) AS budget_terpakai 
                FROM klaim_detail kd,klaim k WHERE k.klaim_id = kd.klaim_id AND kd.budget_id = '${klaimdetail[j].budget_id}'`;
            // console.log(SqlgetBudgetTerpakai);
            let databudgetterpakai = await request.query(SqlgetBudgetTerpakai);
            let budget_terpakai =
              databudgetterpakai.recordset[0].budget_terpakai;

            klaimdetail[j].isclosed =
              klaimdetail[j].isclosed == "Y" ? true : false;
            klaimdetail[j].budget_awal_bgt = klaimdetail[j].budget_awal;
            klaimdetail[j].budget_terpakai = budget_terpakai;
          }

          if (klaimdetail.length > 0) {
            rows[i].lines = klaimdetail;
            rows[i].date_prop = rows[i].date_prop
              ? moment(rows[i].date_prop, "YYYY-MM-DD").format("YYYY-MM-DD")
              : rows[i].date_prop;
            rows[i].tanggal_faktur_pajak = rows[i].tanggal_faktur_pajak
              ? moment(rows[i].tanggal_faktur_pajak, "YYYY-MM-DD").format(
                  "YYYY-MM-DD"
                )
              : rows[i].tanggal_faktur_pajak;
            rows[i].tanggal_invoice = rows[i].tanggal_invoice
              ? moment(rows[i].tanggal_invoice, "YYYY-MM-DD").format(
                  "YYYY-MM-DD"
                )
              : rows[i].tanggal_invoice;
            rows[i].tanggal_posting = rows[i].tanggal_posting
              ? moment(rows[i].tanggal_posting, "YYYY-MM-DD").format(
                  "YYYY-MM-DD"
                )
              : rows[i].tanggal_posting;
            rows[i].updated = rows[i].updated
              ? moment(rows[i].updated, "YYYY-MM-DD").format("YYYY-MM-DD")
              : rows[i].updated;
            let region_desc =
              klaimdetail.length > 0 ? klaimdetail[0].region_id : undefined;
            let sqlgetregionid = `SELECT * FROM r_region WHERE kode = '${region_desc}'`;
            let dataregion = await request.query(sqlgetregionid);

            let sqlgetregionidbydistributor = `SELECT * FROM r_region WHERE kode = '${kode_region}'`;
            let dataregionbydistributor = await request.query(
              sqlgetregionidbydistributor
            );

            let nama_region =
              dataregion.recordset.length > 0
                ? dataregion.recordset[0].nama
                : dataregionbydistributor.recordset.length > 0
                ? dataregionbydistributor.recordset[0].nama
                : "";
            rows[i].nama_region = nama_region;
          }

          //data notifikasi
          rows.notifikasi = [];
          let sel = `SELECT kode_status,status,count(distinct klaim_id)as jml FROM notifikasi_klaim
              WHERE m_user_id = '${m_user_id}' AND is_proses <> 1
              group by kode_status,status`;

          // console.log(sel);
          let res_notif = await request.query(sel);
          res_notif = res_notif.recordset;
          if (res_notif.length > 0) {
            rows.notifikasi = res_notif;
          }

          // console.log(rows.notifikasi);
        }

        // console.log(rows.notifikasi);

        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully...",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  findOne: async function (req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT *,'xxxx' as budget_awal_bgt
      FROM klaim_direct_outlet_v kl
      WHERE 1 = 1 AND kl.klaim_id='${req.param("id")}'`;

      //console.log(queryDataTable);
      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];

        row.isopsipph = row.opsional_pph > 0 ? true : false;
        let queryDataTableKlaimDetail = `SELECT *
          FROM klaim_detail WHERE klaim_id = '${row.klaim_id}'`;
        console.log("queryDataTableKlaimDetail", queryDataTableKlaimDetail);
        let data_klaimdetail = await request.query(queryDataTableKlaimDetail);
        let klaimdetail1 = data_klaimdetail.recordset;

        let queryDataTable = `SELECT createddate as reject_date ,alasan as reason_reject, mu.nama as reject_by FROM reject_klaim_log a 
          inner join m_user mu on a.m_user_id = mu.m_user_id 
          WHERE klaim_id = '${req.param("id")}'  order by createddate DESC `;

        console.log("queryDataTable", queryDataTable);

        let data_reject = await request.query(queryDataTable);
        console.log(data_reject);
        let listReason = data_reject.recordset;

        console.log("momom");

        for (let i = 0; i < listReason.length; i++) {
          listReason[i].no = i + 1;
        }

        row.listReason = listReason;

        let flow = `SELECT klaim_id,convert(varchar(10),a.created,120) as tgl_proses, CASE WHEN status = 'PENGAJUAN' THEN 'Pengajuan' ELSE status END as nama,
          case when rolename = 'SALESHO3'  then 'Approve Sales Head' 
          when rolename = 'SALESGTREGIONKLAIM' then replace(status,rolename,'')
          when rolename = 'SALESMTREGIONKLAIM' then replace(status,rolename,'')
          when rolename = 'DISTRIBUTOR'then'Pengajuan'
          when rolename = 'SALESREGION'then replace(status,rolename,'')
          when rolename = 'ACCOUNTING2' THEN replace(status,rolename,'')
          when rolename = 'ACCOUNTING' THEN replace(status,rolename,'')
          when rolename = 'RSDH' then 'Approve RSM'
          else rolename end as sts
          FROM audit_klaim a
          WHERE klaim_id = '${row.klaim_id}'
          order by a.created asc`;

        let datax = await request.query(flow);
        let flowprogress = datax.recordset;


        row.lines = klaimdetail1;
        row.details = flowprogress;

        console.log("SELESAI PEMBENTUKAN JSON ARRAY RESPON ! ");
        row.date_prop = row.date_prop
          ? moment(row.date_prop, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.date_prop;
        row.tanggal_faktur_pajak = row.tanggal_faktur_pajak
          ? moment(row.tanggal_faktur_pajak, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.tanggal_faktur_pajak;
        row.tanggal_invoice = row.tanggal_invoice
          ? moment(row.tanggal_invoice, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.tanggal_invoice;
        row.tanggal_posting = row.tanggal_posting
          ? moment(row.tanggal_posting, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.tanggal_posting;
        row.updated = row.updated
          ? moment(row.updated, "YYYY-MM-DD").format("YYYY-MM-DD")
          : row.updated;
        let region_desc = klaimdetail1[0].region_id;
        let sqlgetregionid = `SELECT * FROM r_region WHERE kode = '${region_desc}'`;
        let dataregion = await request.query(sqlgetregionid);
        let sqlgetregionidbydistributor = `SELECT * FROM r_region WHERE kode = '${row.kode_region}'`;
        let dataregionbydistributor = await request.query(
          sqlgetregionidbydistributor
        );

        let nama_region =
          dataregion.recordset.length > 0
            ? dataregion.recordset[0].nama
            : dataregionbydistributor.recordset.length > 0
            ? dataregionbydistributor.recordset[0].nama
            : "";
        row.nama_region = nama_region;

        let getUrl = ` SELECT url_tanda_terima FROM klaim k WHERE klaim_id =  '${row.klaim_id}' `;
        let isiUrl = await request.query(getUrl);
        let urlTandaTerima = isiUrl.recordset;
        row.url = urlTandaTerima;

        let total_sales_amount = 0;
        let total_accounting_amount = 0;

        for (let i = 0; i < row.lines.length; i++) {
          let sales_amount = row.lines[i].sales_amount;
          total_sales_amount = total_sales_amount + sales_amount;

          let accounting_amount = row.lines[i].accounting_amount;
          total_accounting_amount = total_accounting_amount + accounting_amount;
        }

        row.sales_approve_amount = total_sales_amount;

        //console.log(row);
        return res.success({
          result: row,
          message: "Fetch data successfully",
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  submitKlaim: async function (req, res) {
    const {
      m_user_id,
      klaim_id,
      noted,
      tanggal_posting,
      r_partner_bank_key_id,
      r_payment_term_klaim_id,
      r_house_bank,
      invoice,
      nomor_faktur
    } = req.body;
    console.log(req.body);
    await DB.poolConnect;

    console.log("m_user_id", m_user_id);
    if (!r_house_bank) {
      return res.error({
        message: "House Bank harus diisi",
      });
    }

    if(nomor_faktur){
    
      if(nomor_faktur.length > 20){
        return res.error({
          message: "Nomor Faktur terlalu panjang maksimal hanya 20 Karakter",
        });
      }

    }


    if (!invoice) {
      return res.error({
        message: "Invoice harus diisi",
      });
    }

    if (!tanggal_posting) {
      return res.error({
        message: "Tanggal Posting harus diisi",
      });
    }

    try {
      const request = DB.pool.request();



      let sqlCheckSubmitKlaim = `SELECT COUNT(1) AS jumlahData FROM log_submit_klaim kas WHERE klaim_id = '${klaim_id}'`;
      let dataCheckSubmitKlaim = await request.query(sqlCheckSubmitKlaim);
      let jumlahData = dataCheckSubmitKlaim.recordset.length > 0 ? dataCheckSubmitKlaim.recordset[0].jumlahData : 0;

      if(jumlahData > 0){
        return res.error({
          message: "Submit klaim sudah pernah dilakukan untuk mencegah double posting maka submit klaim tidak diizinkan harap lapor ke team IT untuk proses pengecekan",
        });
      }

      let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
      let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
      let statusIntegasi =
        datastatusIntegasi.recordset.length > 0
          ? datastatusIntegasi.recordset[0].status
          : "DEV";

      let url = ``;

      let usernamesoap = sails.config.globals.usernamesoap;
      let passwordsoap = sails.config.globals.passwordsoap;

      if (statusIntegasi == "DEV") {

        // url = "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_ws_claim_new/120/zws_sales_claim_new/zbn_sales_claim_new";
        // url = "http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_ws_claim_new/120/zws_ws_claim_new/zbin_ws_claim_new";
        url = "http://sapqasene.enesis.com:8020/sap/bc/srt/rfc/sap/zws_ws_claim_new/210/zws_ws_claim_new/zbin_ws_claim_new";

        usernamesoap = sails.config.globals.usernamesoapdev;
        passwordsoap = sails.config.globals.passwordsoapdev;

      } else {
        url =
          "http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_ws_claim_new/300/zws_ws_claim_new/zbn_ws_claim_new";
      }


      const tok = `${usernamesoap}:${passwordsoap}`;
      const hash = Base64.encode(tok);
      const Basic = "Basic " + hash;
      let datasheader = [];
      let datasdetail = [];

      let sqlgetheader = `SELECT * FROM direct_outlet_header_to_sap_v WHERE klaim_id='${klaim_id}'`;
      // console.log(sqlgetheader);
      let headerresult = await request.query(sqlgetheader);
      let headertempdata = headerresult.recordset[0];

      let payterm = `SELECT * FROM r_payment_term_klaim WHERE r_payment_term_klaim_id = '${r_payment_term_klaim_id}'`;
      // console.log(payterm);
      let dsPayterm = await request.query(payterm);
      let dataPayterm = dsPayterm.recordset[0].kode;

      let bankKey = `SELECT * FROM r_partner_bank_key WHERE r_partner_bank_key_id = '${r_partner_bank_key_id}'`;
      // console.log(bankKey);
      let dsbankKey = await request.query(bankKey);
      let databankKey = dsbankKey.recordset[0].part_bank_key;

      let bldate = moment(headertempdata.tanggal_invoice, "YYYY-MM-DD").format(
        "DD.MM.YYYY"
      );
      let budate = moment(tanggal_posting, "YYYY-MM-DD").format("DD.MM.YYYY");
      let fiscal_year = moment(tanggal_posting, "YYYY-MM-DD").format("YYYY");

      let r_gl_id = headertempdata.r_gl_id;
      let r_ar_id = headertempdata.r_ar_id;
      let value_gl = headertempdata.value_gl;
      let value_ar = headertempdata.value_ar;
      let r_costcenter_id = headertempdata.r_costcenter_id;
      let nominal_pajak = headertempdata.nominal_pajak;

      let nomorKlaim = headertempdata.nomor_klaim;
      let nomorFaktur = headertempdata.nomor_faktur ? headertempdata.nomor_faktur : '';

      let lastNumberNomorKlaim = nomorKlaim.split("/").pop();
      console.log("lastNumberNomorKlaim ",lastNumberNomorKlaim);


      let catatan = noted ? noted : headertempdata.noted;
      console.log("headertempdata.kode_outlet ",headertempdata.kode_outlet);
      console.log("catatan ",catatan);
      let perihalKlaim = headertempdata.kode_outlet+'/'+lastNumberNomorKlaim+'|'+ catatan;      
      perihalKlaim = perihalKlaim.length > 50 ? perihalKlaim.substring(0,50) : perihalKlaim;

      let reference1 = headertempdata.reference1;
      let reference2 = headertempdata.reference2;
      let reference3 = headertempdata.reference3;

      let sqlgetdetailactivity = `SELECT * FROM klaim_activity_to_sap_v WHERE klaim_id='${klaim_id}'`;
      //console.log(sqlgetdetailactivity);
      let detailactivityresult = await request.query(sqlgetdetailactivity);
      let detailactivitytempdata = detailactivityresult.recordset;
      //console.log(detailactivitytempdata);

      let totalKlaim = 0;
      let tottlklaimx = 0;
      let line = 0;
      let listActivity = [];
      let listNomorProposal = [];

      let sqlgetcekdetailactivity = `SELECT * FROM klaim_activity_to_sap_v WHERE klaim_id='${klaim_id}' AND reference2 is null`;
      let detailcekactivityresult = await request.query(
        sqlgetcekdetailactivity
      );
      let detailcekactivitytempdata = detailcekactivityresult.recordset;

      if (detailactivitytempdata.length == 0) {
        console.log("Masuk sini 3");
        return res.error({
          message: `Nilai Approval Sales Region 0, atau mapping kode GL belum tersedia Tidak Bisa Submit SAP`,
        });
      } else if (detailcekactivitytempdata.length > 0) {
        return res.error({
          message: `Kode Brand tidak tersedia cek data di referensi table Brand`,
        });
      } else {
        let nomorx =
          detailactivitytempdata.length > 0
            ? detailactivitytempdata[0].nomor_proposal
            : "";

        console.log("MASUK 2 HAHAHA",detailactivitytempdata);
        for (let i = 0; i < detailactivitytempdata.length; i++) {
          line = line + 1;
          totalKlaim = totalKlaim + detailactivitytempdata[i].accounting_amount;




          let totalpajak = 0;
          if (nominal_pajak > 0) {
            totalpajak =
              (Number(detailactivitytempdata[i].accounting_amount) * 10) / 100;
          }
          let all = totalpajak + detailactivitytempdata[i].accounting_amount;
          let all2 = detailactivitytempdata[i].accounting_amount;

          let activity = detailactivitytempdata[i].activity;

          let nomor_proposal = detailactivitytempdata[i].nomor_proposal;

          let panjang = nomor_proposal.length;
          let ref1 = nomor_proposal.substring(20, panjang);
          let ref3 = nomor_proposal.substring(0, 20);
          let finalamount = Math.round(all);
          let finalamount_detail = Math.round(all2);
          //console.log("##########",finalamount,totalpajak,detailactivitytempdata[i].accounting_amount,all);
          tottlklaimx = tottlklaimx + finalamount;



          // tambah logic plossa
          let sei = false;
          let hi = false;
          let prof_center = detailactivitytempdata[i].profit_center;
          let new_hkont = detailactivitytempdata[i].activity_code;
          if (detailactivitytempdata[i].nomor_proposal.includes("SEI")) {
            sei = true;
          }
          if (detailactivitytempdata[i].nomor_proposal.includes("HI")) {
            hi = true;
          }

          if (detailactivitytempdata[i].reference2 == "00012" && sei == true) {
            prof_center = "120000";
          }

          if (detailactivitytempdata[i].reference2 == "00012" && hi == true) {
            new_hkont = "1151041001";
          }

          console.log("new_hkont ",new_hkont);

          console.log("nomorKlaim ",nomorKlaim);



          datasdetail.push({
            LINE: line,
            HKONT: new_hkont,
            // WRBTR : parseInt(Number(detailactivitytempdata[i].accounting_amount)) + parseInt(totalpajak),
            WRBTR: finalamount_detail,
            ZUONR: "",
            SGTXT: perihalKlaim,
            PRCTR: prof_center,
            XREF1: ref1,
            XREF2: detailactivitytempdata[i].reference2,
            XREF3: ref3,
            KOSTL: detailactivitytempdata[i].costcenter,
          });

          listActivity.push(activity);
          listNomorProposal.push(nomor_proposal);

          // console.log("###############1",r_gl_id,value_gl);

          if (r_gl_id && Number(value_gl) > 0) {
            line = line + 1;

            let sqlgetgl = `SELECT kode FROM r_gl WHERE r_gl_id='${r_gl_id}'`;

            let glresult = await request.query(sqlgetgl);
            let activity_code =
              glresult.recordset.length > 0 ? glresult.recordset[0].kode : "";

            let sqlgetdatacostcenter = `SELECT kode FROM r_costcenter WHERE r_costcenter_id='${r_costcenter_id}'`;

            let costcenterresult = await request.query(sqlgetdatacostcenter);
            let costcenter =
              costcenterresult.recordset.length > 0
                ? costcenterresult.recordset[0].kode
                : "";

            totalKlaim = totalKlaim + Number(value_gl);

            // tambah logic plossa
            let sei = false;
            let hi = false;
            let new_hkont = activity_code;
            if (detailactivitytempdata[i].nomor_proposal.includes("SEI")) {
              sei = true;
            }
            if (detailactivitytempdata[i].nomor_proposal.includes("HI")) {
              hi = true;
            }
            console.log("###############1", r_gl_id, value_gl);

            if (
              detailactivitytempdata[i].reference2 == "00012" &&
              sei == true
            ) {
              prof_center = "120000";
            }

            if (detailactivitytempdata[i].reference2 == "00012" && hi == true) {
              new_hkont = "1151041001";
            }

            datasdetail.push({
              LINE: line,
              HKONT: new_hkont,
              WRBTR: parseInt(value_gl),
              ZUONR: "",
              SGTXT: "",
              PRCTR: "",
              XREF1: reference1,
              XREF2: reference2,
              XREF3: reference3,
              KOSTL: costcenter,
            });
          }
        }

        if (r_ar_id && Number(value_ar) > 0) {
          line = line + 1;

          let sqlgetar = `SELECT kode FROM r_ar WHERE r_ar_id='${r_ar_id}'`;
          let arresult = await request.query(sqlgetar);
          let activity_code =
            arresult.recordset.length > 0 ? arresult.recordset[0].kode : "";

          let sqlgetdatacostcenter = `SELECT kode FROM r_costcenter WHERE r_costcenter_id='${r_costcenter_id}'`;
          let costcenterresult = await request.query(sqlgetdatacostcenter);
          let costcenter =
            costcenterresult.recordset.length > 0
              ? costcenterresult.recordset[0].kode
              : "";

          // headertempdata.kode_soldto = "5000000"
          totalKlaim = totalKlaim + Number(value_ar);
          //console.log("##########",totalKlaim);
          datasdetail.push({
            LINE: line,
            HKONT: activity_code,
            WRBTR: value_ar,
            ZUONR: "",
            SGTXT: "",
            PRCTR: "",
            XREF1: reference1,
            XREF2: reference2,
            XREF3: reference3,
            KOSTL: costcenter,
          });
        }

        if (nominal_pajak > 0) {
          totalKlaim = totalKlaim + nominal_pajak;
        }



        try {
          datasheader.push({
            LIFNR: headertempdata.kode_outlet,
            ZTERM: dataPayterm,
            ZFBDT: budate,
            BVTYP: databankKey,
            BLDAT: bldate,
            BUDAT: budate,
            WRBTR: Math.round(tottlklaimx),
            WAERS: headertempdata.currency,
            MWSKZ: headertempdata.kode_pajak, // ini bukan kode pajak distributor tapi logic tipe pajak
            XBLNR: invoice.substring(0, 16),
            BKTXT: nomorFaktur,
            SGTXT_VENDOR:perihalKlaim,
            LINE: headertempdata.line ? headertempdata.line : "",
            WT_WITHCD: headertempdata.kode_pph,
            WT_QSSHB: headertempdata.kode_pph
              ? Number(headertempdata.tax_base_pph)
              : "",
            WT_QBSHB: headertempdata.kode_pph ? headertempdata.pph : "",
            BUKRS:
              datasdetail.length > 0
                ? datasdetail[0].PRCTR.substring(0, 4)
                : "",
          });

        } catch (error) {
          console.log(error);
        }

        let xml = fs.readFileSync("soap/ZFM_WS_CLAIM_NEW.xml", "utf-8");
        let header = racikXMLHeader(xml, datasheader, "HEADER");
        let finalParamSoap = racikXMLDetail(header, datasdetail, "DETAIL");

        // HIDUPKAN KOMEN DIBAWAH JIKA INGIN LIHAT PARAM YANG DISUBMIT KE SAP
        console.log(finalParamSoap);

        let insertlog = `insert into log_submit_klaim (klaim_id,log_header,log_detail,nomor_klaim)
        VALUES ('${klaim_id}','${header}','${finalParamSoap}','${nomorx}')`;
        // console.log("insertlog : ", insertlog);
        await request.query(insertlog);

        let sampleHeaders = {
          Authorization: Basic,
          "user-agent": "esalesSystem",
          "Content-Type": "text/xml;charset=UTF-8",
          soapAction:
            //"urn:sap-com:document:sap:rfc:functions:ZWS_SALES_CLAIM:ZFM_WS_CLAIMRequest",
            "urn:sap-com:document:sap:rfc:functions:ZWS_WS_CLAIM_NEW:ZFM_WS_CLAIM_NEWRequest",
        };

        let { response } = await soapRequest({
          url: url,
          headers: sampleHeaders,
          xml: finalParamSoap,
          timeout: 1000000,
        }); // Optional timeout parameter(milliseconds)
        let { body, statusCode, statusText } = response;

        // console.log(response.body);
        console.log("statusText ", statusText);
        console.log("statusCode ", statusCode);
        if (statusCode == 200) {
          let dataError = [];
          var parser = new xml2js.Parser({ explicitArray: false });
          parser.parseString(body, async function (err, result) {
            if (err) {
              return res.error({
                message: err,
              });
            }
            //console.log(result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_CLAIM_NEWResponse'].OUT_RETURN);

            let OUT_RETURN =
              result["soap-env:Envelope"]["soap-env:Body"][
                "n0:ZFM_WS_CLAIM_NEWResponse"
              ].OUT_RETURN;
            if (OUT_RETURN) {
              let itemError = OUT_RETURN.item;

              for (let i = 0; i < itemError.length; i++) {
                dataError.push(itemError[i].MESSAGE);
              }
            }

            let BELNR =
              result["soap-env:Envelope"]["soap-env:Body"][
                "n0:ZFM_WS_CLAIM_NEWResponse"
              ].BELNR;
              
            console.log("BELNR ", BELNR);
            console.log("RESP",response);
            if (BELNR == "$" || BELNR == "") {
              if(dataError.length > 0){
                return res.error({
                  message: dataError.toString(),
                });
              }else{
                return res.error({
                  message: "Nilai BELNR hanya $"
                });
              }
            }
            
            if (BELNR.toUpperCase() == "ERROR") {
              return res.error({
                message: err,
              });
            } else {
              let notedqu = ``;
              if (noted && noted != "" && !noted != "null") {
                notedqu = `, noted = '${noted}'`;
              } else {
                notedqu = ``;
              }

              const sql = `UPDATE klaim SET updated=getdate(),
              updatedby = '${m_user_id}',
              kode_status='SKP',
              status='Submit Klaim to SAP',
              reason=NULL,
              invoice = '${invoice}',
              tanggal_posting = '${tanggal_posting}',
              r_partner_bank_key_id = '${r_partner_bank_key_id}',
              r_payment_term_klaim_id = '${r_payment_term_klaim_id}',
              accounting_document_number = '${BELNR}',
              fiscal_year='${fiscal_year}'
              ${notedqu}
              WHERE klaim_id='${klaim_id}'`;
              console.log(sql);

              request.query(sql, async (err, result) => {
                if (err) {
                  return res.error(err);
                }

                const insertAudit = `INSERT INTO klaim_audit_soap
                (createdby, updatedby, klaim_id, soap_format)
                VALUES('${m_user_id}', '${m_user_id}', '${klaim_id}', '${finalParamSoap}')`;
                await request.query(insertAudit);

                let insertKlaim = `INSERT INTO audit_klaim
                (klaim_id, m_user_id, rolename, status)
                VALUES('${klaim_id}', '${m_user_id}','ACCOUNTING', 'Submit Klaim to SAP')`;
                await request.query(insertKlaim);

                listActivity = _.uniq(listActivity);

                return res.success({
                  data: result,
                  message: `Submit klaim to SAP successfully ( ${BELNR} )`,
                });
              });
            }
          });
        } else {
          return res.error({
            message: `Status ${statusCode} ${statusText}`,
          });
        }
      }
    } catch (err) {
      return res.error({
        message: err,
      });
    }
  },
  approveKlaimstatus: async function (req, res) {
    const { m_user_id, klaim_id } = req.body;
    await DB.poolConnect;
    console.log("approve klaim FROM sales");
    try {
      const request = DB.pool.request();

      let sqlcekaction = `SELECT sales_approve_amount,b.kode,c.nama,nomor_klaim,total_klaim,m_distributor_id,kode_status,a.createdby
      FROM klaim a 
      left join m_pajak b on a.m_pajak_id = b.m_pajak_id
      left join r_organisasi c on c.r_organisasi_id = b.r_organisasi_id
      WHERE klaim_id='${klaim_id}'`;

      let dataaction = await request.query(sqlcekaction);
      let nominal = dataaction.recordset.length > 0 ? dataaction.recordset[0].sales_approve_amount
          : 0;
      let kode =
        dataaction.recordset[0].m_distributor_id.length > 0
          ? dataaction.recordset[0].m_distributor_id
          : dataaction.recordset[0].kode;
      let nama_dtb = dataaction.recordset[0].nama;
      let nomor_klaim = dataaction.recordset[0].nomor_klaim;
      let total_klaim = dataaction.recordset[0].total_klaim;
      let kd_sts = dataaction.recordset[0].kode_status;
      let crt = dataaction.recordset[0].createdby;
      //console.log(nominal);
      let sqlgetrole = `SELECT * FROM m_user_role_v murv WHERE m_user_id='${m_user_id}'`;
      let dataroles = await request.query(sqlgetrole);
      let rolename =
        dataroles.recordset.length > 0
          ? dataroles.recordset[0].nama
          : undefined;

      let kode_status = ``;
      let status = ``;
      let cekRsdh = `SELECT email_verifikasi,channel FROM m_distributor_profile_v 
      WHERE m_distributor_id = '${kode}' AND rolename = 'RSDH'
      group by email_verifikasi,channel`;

      console.log(cekRsdh, kd_sts);
      let datacek = await request.query(cekRsdh);
      let rsdata = datacek.recordset;

      if (kd_sts == "DR") {
        let sel = `SELECT * FROM outlet_klaim WHERE kode_alias = '${crt}'`;

        try {
          console.log(sel);
          let dssel = await request.query(sel);
          if (dssel.recordset.length > 0) {
            console.log("ada");

            let upd = `update klaim set 
              accounting_approve_amount = total_klaim ,
              sales_approve_amount = total_klaim ,
              kode_status = 'APN',
              status = 'Approve NSDH',
              updatedby = '${m_user_id}'
              WHERE klaim_id = '${klaim_id}'`;

            let upddetail = `update klaim_detail set sales_amount = total_klaim , accounting_amount = total_klaim 
              WHERE klaim_id = '${klaim_id}'`;

            try {
              await request.query(upd);
              await request.query(upddetail);
              return res.success({
                data: null,
                message: "Approve Klaim successfully",
              });
            } catch (error) {
              console.log(error);
              return res.error("ok");
            }
          } else {
            console.log("ga ada");
          }
        } catch (error) {
          console.log(error);
        }
      }

      // console.log(rsdata);
      // return res.error("ok")
      let dataEmailNotif = [];
      let subject_ = "";
      let channel = rsdata.length > 0 ? rsdata[0].channel : null;

      if (rolename) {
        console.log(rolename, "@@@@@@@@@@@@@@@@@");
        if (rolename == "RSDH") {
          kode_status = `, kode_status='APR' `;
          status = `, status='Waiting NSDH' `;
          // tambah disini

          if (channel == "MT") {
            dataEmailNotif.push("ela.krisdiawati@enesis.com");
          } else if (channel == "GT") {
            dataEmailNotif.push("ting.ce@enesis.com");
          } else {
            dataEmailNotif.push("henry.irawan@enesis.com");
          }
          subject_ = "WAITING APPROVAL NSDH";
        } else if (rolename == "NSDH" || rolename == "SALESHO3") {
          kode_status = `, kode_status='APN' `;
          status = `, status='Approve NSDH' `;
          subject_ = "WAITING PROCESS ACCOUNTING";

          let cekAcc = `SELECT * FROM email_klaim WHERE role = 'ACC' AND kode_channel = '${channel}'`;
          let dataACC = await request.query(cekAcc);
          let rsAcc = dataACC.recordset;
          if (rsAcc.length > 0) {
            for (let i = 0; i < rsAcc.length; i++) {
              dataEmailNotif.push(rsAcc[i].email_verifikasi);
            }
          }
        } else {
          kode_status = `, kode_status='APS' `;
          status = `, status='Waiting RSDH' `;
          subject_ = "WAITING APPROVAL RSDH";
          // tambahan disini
          if (rsdata.length > 0) {
            for (let i = 0; i < rsdata.length; i++) {
              dataEmailNotif.push(rsdata[i].email_verifikasi);
            }
          }
          // console.log("disini juga");
        }
        const param = {
          subject: `${subject_}`,
          distributor: `${nama_dtb}`,
          nomor_klaim: nomor_klaim,
          nominal_klaim: `Rp. ${total_klaim}`,
        };

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi =
          datastatusIntegasi.recordset.length > 0
            ? datastatusIntegasi.recordset[0].status
            : "DEV";

        if (statusIntegasi == "DEV") {
          dataEmailNotif = [];
          dataEmailNotif.push("tiasadeputra@gmail.com");
        }

        const template = await sails.helpers.generateHtmlEmail.with({
          htmltemplate: "approveklaimsales",
          templateparam: param,
        });
        SendEmail(dataEmailNotif.toString(), param.subject, template);
      } else {
        return res.error({
          message: "Role Approval tidak dikenali",
        });
      }

      let sql = ``;
      if (nominal > 0) {
        sql = `UPDATE 
      klaim SET updated=getdate(),
      updatedby = '${m_user_id}',
      reason=NULL
      ${kode_status}
      ${status}
      WHERE klaim_id='${klaim_id}'`;

        // sql = `UPDATE
        // klaim SET updated=getdate()
        // WHERE klaim_id='${klaim_id}'`;
      } else {
        sql = `UPDATE klaim SET updated=getdate(),
      updatedby = '${m_user_id}',
      sales_approve_amount = total_klaim,
      accounting_approve_amount = total_klaim,
      reason=NULL
      ${kode_status}
      ${status}
      WHERE klaim_id='${klaim_id}'`;

        // sql = `UPDATE klaim SET updated=getdate()
        // WHERE klaim_id='${klaim_id}'`;
      }

      if (!channel) {
        return res.error({
          message:
            "RSM distributor tidak ditemukan untuk melanjutkan approval selanjutnya Harap hubungi divisi IT untuk perbaikan data",
        });
      } else if (rsdata.length == 0) {
        return res.error({
          message: "RSDH Distibutor tidak ditemukan harap hubungi IT Divisi",
        });
      } else {
        request.query(sql, async (err, result) => {
          if (err) {
            return res.error(err);
          }

          let insertKlaim = `INSERT INTO audit_klaim
        (klaim_id, m_user_id, rolename, status)
        VALUES('${klaim_id}', '${m_user_id}',
        '${rolename}', 'Approve ${rolename}')`;

          await request.query(insertKlaim);

          return res.success({
            data: result,
            message: "Approve Klaim successfully",
          });
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  exportExcel: async function (req, res) {
    const {
      query: {
        periode,
        periode1,
        status,
        m_direct_outlet_id,
      },
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let WherePeriode = ``;
      if (periode) {
        WherePeriode = `AND CONVERT(VARCHAR(10),a.tanggal_create,120) BETWEEN '${periode}' AND '${periode1}'`;
      }

      let WhereOutlet = ``;
      if (m_direct_outlet_id) {
        WhereOutlet = `AND a.m_direct_outlet_id = '${m_direct_outlet_id}' `;
      }

      let WhereStatus = ``;
      if (status) {
        WhereStatus = `AND a.kode_status = '${status}'`;
      }


      let queryDataTable = `SELECT a.*
      FROM direct_outlet_v a
      WHERE 1=1 ${WherePeriode} ${WhereStatus} ${WhereOutlet}
      ORDER BY a.tanggal_create DESC`;

      console.log("CEK Query : ", queryDataTable);

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }
        
        const rows = result.recordset;
        let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {
          let obj = {
            "NO DOCUMEN KLAIM": rows[i].nomor_klaim,
            "NAMA OUTLET": rows[i].nama_outlet,
            "TANGGAL PENGAJUAN": rows[i].tanggal_create,
            "TANGGAL INVOICE": rows[i].tanggal_invoice,
            "DOCUMENT SAP": rows[i].accounting_document_number,
            "NAMA NPWP": rows[i].nama_npwp,
            "NOMOR EPROPOSAL": rows[i].nomor_proposal,
            "NOMOR NPWP": rows[i].nomor_npwp,
            "NOMOR FAKTUR": rows[i].nomor_faktur,
            "INVOICE": rows[i].invoice,
            "PERIODE KLAIM": rows[i].periode_klaim,
            "TANGGAL TRANSFER": rows[i].tgl_bayar,
            "NOMOR PAYMENT": rows[i].nomor_payment,
            "NOMOR RESI": rows[i].nomor_resi,
            "JASA PENGIRIMAN": rows[i].jasa_pengiriman,
            "TANGGAL FAKTUR": rows[i].tanggal_faktur_pajak,
            "PERIHAL": rows[i].perihal_klaim,
            "TIPE PAJAK": rows[i].tipe_pajak,
            "NOMINAL KLAIM": rows[i].total_klaim,
            "NOMINAL PAJAK": rows[i].nominal_pajak,
            "NOMINAL SETELAH PPN": rows[i].nominal_claimable,
            "STATUS": rows[i].status
          };

          arraydetailsforexcel.push(obj);
        }
        // console.log(arraydetailsforexcel);

        if (arraydetailsforexcel.length > 0) {
          let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
          let namafile = "klaim_".concat(tglfile).concat(".xlsx");

          console.log('namafile ',namafile);

          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader("Content-Type", "application/vnd.openxmlformats");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + namafile
          );
          res.end(hasilXls, "binary");
        } else {
          let obj = {
            "NO DOCUMEN KLAIM": "",
            "NAMA OUTLET": "",
            "TANGGAL PENGAJUAN": "",
            "TANGGAL INVOICE": "",
            "NOMOR PROPOSAL": "",
            "DOCUMENT SAP": "",
            "NAMA NPWP": "",
            "NOMOR EPROPOSAL": "",
            "NOMOR NPWP": "",
            "NOMOR FAKTUR": "",
            "INVOICE": "",
            "TANGGAL TRANSFER": "",
            "NOMOR PAYMENT": "",
            "NOMOR RESI": "",
            "JASA PENGIRIMAN": "",
            "TANGGAL FAKTUR": "",
            "PERIHAL": "",
            "NOMINAL KLAIM": "",
            "NOMINAL PAJAK": "",
            "NOMINAL SETELAH PPN": "",
            "STATUS": ""
          };

          arraydetailsforexcel.push(obj);

          let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
          let namafile = "klaim_".concat(tglfile).concat(".xlsx");

          var hasilXls = json2xls(arraydetailsforexcel);
          res.setHeader("Content-Type", "application/vnd.openxmlformats");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + namafile
          );
          res.end(hasilXls, "binary");
        }
      });
    } catch (err) {
      return res.error(err);
    }
  },
};

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


function pad(d) {
  var str = "" + d;
  var pad = "00000";
  var ans = pad.substring(0, pad.length - str.length) + str;
  return ans;
}