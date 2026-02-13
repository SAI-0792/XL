import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Use the SAME database as the server - smart-parking (with hyphen)
const MONGO_URI = 'mongodb://localhost:27017/smart-parking';

async function updateAdminPassword() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB:', MONGO_URI);

        const adminEmail = '99230041261@klu.ac.in';
        const adminPassword = 'Sai@1886643';

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // First, list all users to debug
        const allUsers = await usersCollection.find({}).toArray();
        console.log('\nAll users in database:');
        allUsers.forEach(u => console.log(`  - ${u.email} (role: ${u.role})`));

        // Check if user exists
        const existingUser = await usersCollection.findOne({ email: adminEmail });

        if (existingUser) {
            // Hash the new password and update
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(adminPassword, salt);

            await usersCollection.updateOne(
                { email: adminEmail },
                { $set: { passwordHash, role: 'ADMIN' } }
            );
            console.log(`\n✅ Updated user "${adminEmail}" - role set to ADMIN, password updated`);
        } else {
            // Create new admin user
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(adminPassword, salt);

            await usersCollection.insertOne({
                name: 'Admin',
                email: adminEmail,
                passwordHash,
                role: 'ADMIN',
                vehicles: [],
                managedCars: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`\n✅ Created new admin user: ${adminEmail}`);
        }

        // Verify
        const verifyUser = await usersCollection.findOne({ email: adminEmail });
        console.log('\nFinal verification:', {
            email: verifyUser?.email,
            role: verifyUser?.role,
            hasPassword: !!verifyUser?.passwordHash
        });

        console.log('\n🎉 Done! Login at /admin');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

updateAdminPassword();
