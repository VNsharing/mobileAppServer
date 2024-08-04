const express = require('express');
const cors = require('cors');
const { client, connectDB } = require('./db');
const bodyParser = require('body-parser');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS if needed
app.use(bodyParser.json());

// Import database connection
connectDB();

// Define API routes

//get data for dailychecker (daily checker)
app.get('/dailyChecker', async (req, res) => {
  try {
    const query = `
      SELECT e.id, e.name, a.date AS attendance_date, a.status AS attendance_status, a.color AS attendance_color
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id
      ORDER BY e.id, a.date
    `;
    const result = await client.query(query);

    // Process the results to format them as required
    const formattedData = result.rows.reduce((acc, row) => {
      const { employee_id, name, attendance_date, attendance_status } = row;

      // Find or create the employee entry
      let employee = acc.find(e => e.idemployee === employee_id);
      if (!employee) {
        employee = { idemployee: employee_id, name, attendance: [] };
        acc.push(employee);
      }

      // Add the attendance record if it exists
      if (attendance_date && attendance_status) {
        employee.attendance.push({ status: attendance_status, datetime: attendance_date });
      }

      return acc;
    }, []);

    res.json(formattedData);

  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//update employee password (account)
app.patch('/updatePassword', async (req, res) => {
  const { employeeId, newPassword } = req.body;

  if (!employeeId || !newPassword) {
    return res.status(400).json({ error: 'employeeId and newPassword are required' });
  }

  try {
    const query = 'UPDATE employees SET password = $1 WHERE id = $2 RETURNING *';
    const values = [newPassword, employeeId];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//get attendance data (schedule screen)
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

//update attendance for an employee (schedule screen)
app.post('/updateAttendance', async (req, res) => {
  const { employeeId, date, status, color} = req.body;

  // Log the request body to check the values being received
  console.log('Request Body:', req.body);
  
  try {
    const query = `
      INSERT INTO attendance (employee_id, date, status, color)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (employee_id, date)
      DO UPDATE SET status = EXCLUDED.status, color = EXCLUDED.color
      RETURNING *;
    `;
    const values = [employeeId, date, status, color];
    const result = await client.query(query, values);
    
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//sample api for basic login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const query = 'SELECT * FROM employees WHERE email = $1 AND password = $2';
    const values = [email, password];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Assuming you have some user data to return on successful login
    res.status(200).json({ message: 'Login successful', user: result.rows[0] });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//ban an employee (employee tab)
app.patch('/banEmployee', async (req, res) => {
  const { employeeId } = req.body;

  try {
    const query = 'UPDATE employees SET status = $1 WHERE id = $2 RETURNING *';
    const values = ['Banned', employeeId];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee status updated to Banned', employee: result.rows[0] });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//unban an employee (employee tab)
app.patch('/unbanEmployee', async (req, res) => {
  const { employeeId } = req.body;

  try {
    const query = 'UPDATE employees SET status = $1 WHERE id = $2 RETURNING *';
    const values = ['Active', employeeId];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee status updated to Active', employee: result.rows[0] });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//add a new employee (emloyee tab)
app.post('/addEmployee', async (req, res) => {
  const { name, dob, address, idNumber, phone, email, password, paymentType, amount } = req.body;

  try {

    // Insert new employee
    const insertEmployeeQuery = `
      INSERT INTO employees (name, phone, email, password, cmnd, birth_date, address, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'employee', 'active')
      RETURNING id;
    `;
    const employeeValues = [name, phone, email, password, idNumber, dob, address];
    const employeeResult = await client.query(insertEmployeeQuery, employeeValues);
    
    const employeeId = employeeResult.rows[0].id;
    
    // Insert salary for the new employee
    const insertSalaryQuery = `
      INSERT INTO salaries (employee_id, type, salaries)
      VALUES ($1, $2, $3);
    `;
    const salaryValues = [employeeId, paymentType, amount];
    await client.query(insertSalaryQuery, salaryValues);
   
    res.status(201).json({ message: 'Employee and salary added successfully', employeeId });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } 
});

//update employee information (Employee tab)
app.patch('/editEmployee', async (req, res) => {
  const { employeeId, name, dob, address, idNumber, phone, email, password, paymentType, amount } = req.body;

  try {
    
    // Update employee details
    const updateEmployeeQuery = `
      UPDATE employees
      SET name = $1, phone = $2, email = $3, password = $4, cmnd = $5, birth_date = $6, address = $7
      WHERE id = $8;
    `;
    const employeeValues = [name, phone, email, password, idNumber, dob, address, employeeId];
    await client.query(updateEmployeeQuery, employeeValues);
    
    // Update or insert salary for the employee
    const upsertSalaryQuery = `
      INSERT INTO salaries (employee_id, type, salaries)
      VALUES ($1, $2, $3)
      ON CONFLICT (employee_id)
      DO UPDATE SET type = EXCLUDED.type, salaries = EXCLUDED.salaries;
    `;
    const salaryValues = [employeeId, paymentType, amount];
    await client.query(upsertSalaryQuery, salaryValues);
    
    res.status(200).json({ message: 'Employee and salary updated successfully' });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } 
});

//Get account information (account)
app.get('/accountInformation', async (req, res) => {
  const { employeeId } = req.body;

  try {
    // Query to get employee information excluding id and password
    const query = `
      SELECT id, name, phone, email, password, cmnd AS idNumber, birth_date AS dob, address, role, status
      FROM employees
      WHERE id = $1;
    `;
    const result = await client.query(query, [employeeId]);

    // Check if employee exists
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } 
});

//calculate salary for month (EmployeeTab)
app.get('/calculateTotalSalaries', async (req, res) => {
  try {
    // Query to calculate total salaries for each employee for each month
    const query = `
      SELECT 
        TO_CHAR(a.date, 'YYYY-MM') AS month,
        e.id AS employee_id,
        e.name,
        s.salaries AS daily_salary,
        COUNT(a.date) AS present_days,
        COUNT(a.date) * s.salaries AS total_salary
      FROM 
        employees e
      JOIN 
        salaries s ON e.id = s.employee_id
      JOIN 
        attendance a ON e.id = a.employee_id
      WHERE 
        a.status = 'Present'
      GROUP BY 
        month, e.id, e.name, s.salaries;
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    // Calculate total salaries for each month
    const monthlySalaries = result.rows.reduce((acc, row) => {
      const { month, employee_id, name, total_salary } = row;
      
      if (!acc[month]) {
        acc[month] = {
          totalSalaryForMonth: 0,
          employees: [],
        };
      }

      acc[month].totalSalaryForMonth += parseFloat(total_salary);
      acc[month].employees.push({
        employee_id,
        name,
        total_salary
      });

      return acc;
    }, {});

    res.status(200).json({
      message: 'Total salaries for each month calculated successfully',
      monthlySalaries,
    });
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






// app.get('/testAPI', async (req, res) => {
//   try {
//     const query = `
//       SELECT * FROM employees
//     `;
//     console.log('Received request for /testAPI');
//     const result = await client.query(query);
//     console.log('Query result:', result.rows);

//     res.json(result.rows);
//   } catch (err) {
//     console.error('Error executing query', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });




// app.delete('/deleteEmployee', async (req, res) => {
//   const employeeId = req.body;

//   try {
//     const query = 'DELETE FROM employees WHERE id = $1 RETURNING *';
//     const values = [employeeId];
//     const result = await client.query(query, values);

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: 'Employee not found' });
//     }

//     res.status(200).json({ message: 'Employee deleted successfully', deletedEmployee: result.rows[0] });
//   } catch (err) {
//     console.error('Error executing query', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });















