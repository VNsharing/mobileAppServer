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


app.get('/employeeTab', async (req, res) => {
  try {
    const query = `
      SELECT e.name, s.salaries
      FROM employees e
      JOIN salaries s ON e.id = s.employee_id
    `;
    const result = await client.query(query);
    
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/scheduleScreen', async (req, res) => {
  try {
    const query = `
      SELECT e.id, e.name, a.date AS attendance_date, a.status AS attendance_status, a.color AS attendance_color
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id
      ORDER BY e.id, a.date
    `;
    const result = await client.query(query);
    
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/addEmployees', async (req, res) => {


  try {
    const query = `
      
    `;
    const result = await client.query(query);
    
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/formattedAttendance', async (req, res) => {
  try {
    const query = `
      SELECT e.id as employee_id, e.name, a.status, a.date as datetime, a.color
      FROM employees e
      JOIN attendance a ON e.id = a.employee_id
      ORDER BY e.id, a.date
    `;
    const result = await client.query(query);

    const employees = {};
    result.rows.forEach(row => {
      if (!employees[row.employee_id]) {
        employees[row.employee_id] = {
          id: row.employee_id,
          name: row.name,
          attendance: []
        };
      }
      employees[row.employee_id].attendance.push({
        status: row.status,
        datetime: row.datetime,
        color: row.color
      });
    });

    const formattedResult = Object.values(employees);

    res.json(formattedResult);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/updateAttendance', async (req, res) => {
  const { employeeId, date, status, color, checkInTime, checkOutTime } = req.body;

  // Log the request body to check the values being received
  console.log('Request Body:', req.body);
  
  try {
    const query = `
      INSERT INTO attendance (employee_id, date, status, color, check_in_time, check_out_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (employee_id, date)
      DO UPDATE SET status = EXCLUDED.status, color = EXCLUDED.color, check_in_time = EXCLUDED.check_in_time, check_out_time = EXCLUDED.check_out_time
      RETURNING *;
    `;
    const values = [employeeId, date, status, color, checkInTime, checkOutTime];
    const result = await client.query(query, values);
    
    res.status(200).json(result.rows[0]);
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