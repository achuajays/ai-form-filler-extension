import aiosqlite
import json
from models import Profile, Address

DB_PATH = "form_filler.db"

class DBService:
    async def init_db(self):
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name TEXT,
                    last_name TEXT,
                    email TEXT,
                    phone TEXT,
                    company TEXT,
                    job_title TEXT,
                    address_street TEXT,
                    address_city TEXT,
                    address_state TEXT,
                    address_zip TEXT,
                    extracted_text TEXT
                )
            """)
            await db.commit()

    async def save_profile(self, profile: Profile) -> int:
        async with aiosqlite.connect(DB_PATH) as db:
            # Check if profile exists (basic logic: if ID provided, update; else insert)
            if profile.id:
                await db.execute("""
                    UPDATE profiles SET 
                        first_name=?, last_name=?, email=?, phone=?, company=?, job_title=?,
                        address_street=?, address_city=?, address_state=?, address_zip=?,
                        extracted_text=COALESCE(?, extracted_text)
                    WHERE id=?
                """, (
                    profile.firstName, profile.lastName, profile.email, profile.phone,
                    profile.company, profile.jobTitle,
                    profile.address.street if profile.address else None,
                    profile.address.city if profile.address else None,
                    profile.address.state if profile.address else None,
                    profile.address.zip if profile.address else None,
                    profile.extracted_text,
                    profile.id
                ))
                await db.commit()
                return profile.id
            else:
                cursor = await db.execute("""
                    INSERT INTO profiles (
                        first_name, last_name, email, phone, company, job_title,
                        address_street, address_city, address_state, address_zip, extracted_text
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    profile.firstName, profile.lastName, profile.email, profile.phone,
                    profile.company, profile.jobTitle,
                    profile.address.street if profile.address else None,
                    profile.address.city if profile.address else None,
                    profile.address.state if profile.address else None,
                    profile.address.zip if profile.address else None,
                    profile.extracted_text
                ))
                await db.commit()
                return cursor.lastrowid

    async def get_profile(self, profile_id: int) -> Profile:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM profiles WHERE id = ?", (profile_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return Profile(
                        id=row['id'],
                        firstName=row['first_name'],
                        lastName=row['last_name'],
                        email=row['email'],
                        phone=row['phone'],
                        company=row['company'],
                        jobTitle=row['job_title'],
                        address=Address(
                            street=row['address_street'],
                            city=row['address_city'],
                            state=row['address_state'],
                            zip=row['address_zip']
                        ),
                        extracted_text=row['extracted_text']
                    )
                return None
