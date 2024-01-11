/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: { table, like, field, order_by, order_type,where,field2,where2,keyword }
    } = req;

    // console.log(req.query);
    
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let whereLike = ''
      if (like) {
        whereLike = `AND ${field} LIKE '%${like}%'`;
      } else {
        whereLike = ''
      }


      let whereKeyword = ''
      if (keyword) {
        whereKeyword = `AND (UPPER(kode) LIKE UPPER('%${keyword}%') OR UPPER(nama) LIKE UPPER('%${keyword}%'))`;
      } else {
        whereKeyword = ''
      }

      let whereClause = ''
      if (where) {
        whereClause = `AND ${field} = '${where}'`;
      } else {
        whereClause = ``;
      }

      if(where2){
        whereClause = whereClause + ` AND ${field2} = '${where2}'` 
      }

      let orderBy = ''
      if(order_by)
      {
        orderBy = `ORDER BY ${order_by}`;
      }

      let orderType = ''
      if(order_type)
      {
        orderType = `${order_type}`;
      }

      let groupby = ``
      let all = `*`
      if(table == "v_m_produk_b2b"){
          groupby = "group by  m_produk_id,kode,nama,price,Kode_sap,diskon";
          all = ` m_produk_id,kode,nama,price,kode_sap,diskon `
      }

      let queryDataTable = `SELECT ${all} FROM ${table} WHERE 1=1 ${whereClause} ${whereLike} ${whereKeyword} ${groupby} ${orderBy} ${orderType}`;      
      
      // console.log(queryDataTable);
      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;

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
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  findItemB2b: async function (req, res) {
    const {
      query: { table, like, field, order_by, order_type,where }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let whereLike = ''
      if (like) {
        whereLike = `AND ${field} LIKE '%${like}%'`;
      } else {
        whereLike = ''
      }


      let whereClause = ''
      if (where) {
        whereClause = `AND ${field} = '${where}'`;
      } else {
        whereClause = ``;
      }

      let orderBy = ''
      if(order_by)
      {
        orderBy = `ORDER BY ${order_by}`;
      }

      let orderType = ''
      if(order_type)
      {
        orderType = `${order_type}`;
      }


      let queryDataTable = `SELECT * FROM ${table} WHERE 1=1 ${whereClause} ${whereLike} ${orderBy} ${orderType}`;      
      // console.log(queryDataTable);
      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;

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
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};
