import os

path = 'attendance_portal_backend/apps/users/serializers.py'
with open(path, 'r') as f:
    lines = f.readlines()

new_lines = []
skip_next = False
for i, line in enumerate(lines):
    if skip_next:
        skip_next = False
        continue

    # Fix StudentProfileSerializer
    if "'is_verified', 'student_id', 'current_level', 'current_semester', 'hardware_finger_id'," in line:
        new_lines.append(line)
        new_lines.append("        ]\n") # Close the fields list
        new_lines.append("\n    def get_userName(self, obj):\n        return obj.user.get_full_name() or obj.user.username\n")
        continue

    # Fix TeacherProfileSerializer
    if "'email', 'faculty', 'department', 'is_verified', 'employee_id'," in line:
        new_lines.append(line)
        new_lines.append("        ]\n") # Close the fields list
        new_lines.append("\n    def get_userName(self, obj):\n        return obj.user.get_full_name() or obj.user.username\n")
        # Skip the broken lines that my previous script inserted
        j = i + 1
        while j < len(lines) and ("]" in lines[j] or "get_userName" in lines[j] or "return" in lines[j]):
            j += 1
        # Calculate how many to skip
        # Actually simpler to just filter them out if they are exactly the ones I know I messed up
        continue

    # Filter out the mess from previous script if it's there
    if "def get_userName(self, obj):" in line and "StudentProfile" not in lines[i-1] and "TeacherProfile" not in lines[i-1] and "UserMeSerializer" not in lines[i-10]:
        # This is a bit risky, let's just rewrite the whole file content carefully
        pass

    new_lines.append(line)

# Let's try a safer way: rewrite the classes from scratch since they are small
content = "".join(new_lines)

with open(path, 'w') as f:
    f.write(content)
