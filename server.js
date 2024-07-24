const express = require('express');
const cors = require('cors');
const { client, connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS if needed

// Import database connection
connectDB();

// Define API routes
app.get('/dailycheck', async (req, res) => {
  try {
    const query = `
      SELECT e.id, e.name, a.date AS attendance_date, a.status AS attendance_status, a.color AS attendance_color
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id
      ORDER BY e.id, a.date
    `;
    const result = await client.query(query);
    
    // // Transform data into desired structure
    // const formattedResults = [];
    // let currentEmployee = null;

    // result.rows.forEach(row => {
    //   if (!currentEmployee || currentEmployee.id !== row.id) {
    //     if (currentEmployee) {
    //       formattedResults.push({
    //         id: currentEmployee.id,
    //         name: currentEmployee.name,
    //         attendance: currentEmployee.attendance,
    //       });
    //     }

    //     currentEmployee = {
    //       id: row.id,
    //       name: row.name,
    //       attendance: [],
    //     };
    //   }

    //   currentEmployee.attendance.push({
    //     date: row.attendance_date,
    //     status: row.attendance_status,
    //     color: row.attendance_color,
    //   });
    // });

    // // Push the last employee to the formattedResults array
    // if (currentEmployee) {
    //   formattedResults.push({
    //     id: currentEmployee.id,
    //     name: currentEmployee.name,
    //     attendance: currentEmployee.attendance,
    //   });
    // }

    // res.json(formattedResults);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/testAPI', async (req, res) => {
  try {
    const query = `
      SELECT * FROM employees
    `;
    console.log('Received request for /testAPI');
    const result = await client.query(query);
    console.log('Query result:', result.rows);

    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
//npmm install , node sever.js 