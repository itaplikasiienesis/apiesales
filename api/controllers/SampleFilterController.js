/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");

module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: { current, pageSize, field, order, searchText }
    } = req;

    // UNTUK ORDER BY
    let orderBy = `ORDER BY created desc`;
    if(order){
      let orderType = (order === 'ascend') ? 'ASC' : 'DESC';
      orderBy = `ORDER BY ${field} ${orderType}`;
    }

    // UNTUK FILTER SEARCH
    let whereClause = ``;
    if(searchText)
    {
      whereClause = `WHERE nama LIKE '%${searchText}%'
      OR username LIKE '%${searchText}%' OR OS LIKE '%${searchText}%'`;
    }

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(current, pageSize);

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM m_user ${whereClause}`;

      let queryDataTable = `SELECT * FROM m_user ${whereClause} ${orderBy} OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(current, count, rows, pageSize);
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
};
