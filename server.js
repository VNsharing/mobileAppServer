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


//get list of employees
app.get('/getAllEmployees', async (req, res) => {
  try {
    const query = `
      SELECT id, name, phone, email, cmnd AS idNumber, birth_date AS dob, address, role, status
      FROM employees
      ORDER BY id;
    `;
    const result = await client.query(query);

    res.status(200).json(result.rows);
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
      LEFT JOIN attendance a ON e.id = a.employee_id
      ORDER BY e.id, a.date;
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

    res.json(Object.values(employees));
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//insert attendance for an employee (schedule screen)
app.post('/insertAttendance', async (req, res) => {
  const { employee_id, date, status, color } = req.body;

  console.log('Request Body:', req.body);

  if (!employee_id || !date || !status || !color) {
    return res.status(400).json({ error: 'All fields (employee_id, date, status, color) are required' });
  }

  try {
    const query = `
      INSERT INTO attendance (employee_id, date, status, color)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (employee_id, date)
      DO NOTHING
      RETURNING *;
    `;
    const values = [employee_id, date, status, color];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Attendance record already exists' });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//update attendance for an employee (schedule screen)
app.patch('/updateAttendance', async (req, res) => {
  const { employee_id, date, status, color } = req.body;

  console.log('Request Body:', req.body);

  if (!employee_id || !date || !status || !color) {
    return res.status(400).json({ error: 'All fields (employee_id, date, status, color) are required' });
  }

  try {
    const query = `
      UPDATE attendance
      SET status = $1, color = $2
      WHERE employee_id = $3 AND date = $4
      RETURNING *;
    `;
    const values = [status, color, employee_id, date];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

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

    const user = result.rows[0];

    if (user.role === 'admin') {
      res.status(200).json({ message: 'Login successful', user });
    } else {
      res.status(403).json({ error: 'Wrong account. Please use an admin account to log in.' });
    }
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
      WITH months AS (
        SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') AS month
        FROM attendance
      )
      SELECT 
        m.month,
        e.id AS employee_id,
        e.name,
        COALESCE(s.salaries, 0) AS daily_salary,
        COUNT(a.date) FILTER (WHERE a.status = 'Present') AS present_days,
        COALESCE(COUNT(a.date) FILTER (WHERE a.status = 'Present') * s.salaries, 0) AS total_salary
      FROM 
        months m
      CROSS JOIN 
        employees e
      LEFT JOIN 
        salaries s ON e.id = s.employee_id
      LEFT JOIN 
        attendance a ON e.id = a.employee_id AND TO_CHAR(a.date, 'YYYY-MM') = m.month
      GROUP BY 
        m.month, e.id, e.name, s.salaries
      ORDER BY 
        m.month, e.id;
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
        total_salary,
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


//get data for dailychecker (daily checker)
// app.get('/dailyChecker', async (req, res) => {
//   try {
//     const query = `
//       SELECT e.id AS employee_id, e.name, a.date AS attendance_date, a.status AS attendance_status, a.color AS attendance_color
//       FROM employees e
//       LEFT JOIN attendance a ON e.id = a.employee_id
//       ORDER BY e.id, a.date
//     `;
//     const result = await client.query(query);

//     // Using a Map to group employees
//     const employeeMap = new Map();

//     result.rows.forEach(row => {
//       const { employee_id, name, attendance_date, attendance_status } = row;

//       if (!employeeMap.has(employee_id)) {
//         employeeMap.set(employee_id, { employee_id, name, attendance: [] });
//       }

//       const employee = employeeMap.get(employee_id);
      
//       // Add the attendance record if it exists, otherwise, push a null attendance record
//       if (attendance_date && attendance_status) {
//         employee.attendance.push({ status: attendance_status, datetime: attendance_date });
//       }
//     });

//     // Convert the Map to an array and ensure each employee has at least one null attendance record if none exists
//     const formattedData = Array.from(employeeMap.values()).map(employee => {
//       if (employee.attendance.length === 0) {
//         employee.attendance.push(null);
//       }
//       return employee;
//     });

//     res.json(formattedData);

//   } catch (err) {
//     console.error('Error executing query', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });












