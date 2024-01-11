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

      let queryCountTable = `SELECT 
      COUNT(1)
      FROM cmo c,c_order co
      WHERE c.isactive = 'Y'
      AND c.cmo_id = co.cmo_id ${whereClause}`;

      let queryDataTable = `SELECT 
                        c.cmo_id,co.c_order_id,
                        c.nomor_cmo,c.no_sap,
                        CONCAT(CASE WHEN c.bulan = 1 THEN 'Januari' 
                        WHEN c.bulan = 2 THEN 'Februari'
                        WHEN c.bulan = 3 THEN 'Maret'
                        WHEN c.bulan = 4 THEN 'April'
                        WHEN c.bulan = 5 THEN 'Mei'
                        WHEN c.bulan = 6 THEN 'Juni'
                        WHEN c.bulan = 7 THEN 'Juli'
                        WHEN c.bulan = 8 THEN 'Agustus'
                        WHEN c.bulan = 9 THEN 'September'
                        WHEN c.bulan = 10 THEN 'Oktober'
                        WHEN c.bulan = 11 THEN 'November'
                        ELSE 'Desember' END,
                        '-',c.tahun) AS periode,
                        CONCAT('Minggu Ke-',co.week_number) AS urutan_minggu,
                        co.nomor_sap AS so_no_sap,
                        co.nomor_shipment AS no_resi_pengiriman
                        FROM cmo c,c_order co
                        WHERE c.isactive = 'Y'
                        AND c.cmo_id = co.cmo_id
                        ORDER BY c.tahun,c.bulan,co.week_number
                        OFFSET ${offset} ROWS
                        FETCH NEXT ${limit} ROWS ONLY`;

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);


        for (let i = 0; i < rows.length; i++) {

          let SqlAudit = `SELECT ao.created AS tanggal,ao.audit_order_id,
          ao.c_order_id,ao.m_user_id,mu.nama,ao.status,
          CONCAT(dbo.CamelCase(CONCAT(ao.actions,' Oleh')),' ',mu.nama) AS keterangan
          FROM audit_order ao
          LEFT JOIN m_user mu ON(mu.m_user_id = ao.m_user_id)
          WHERE ao.c_order_id = '${rows[i].c_order_id}'`;
          const audit = await request.query(SqlAudit);          
          rows[i].audit = audit.recordset
                    
        }

        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }

}
