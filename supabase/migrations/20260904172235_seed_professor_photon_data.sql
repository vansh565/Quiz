/*
# Professor Photon - Seed Data

## Overview
Seeds the database with the initial Class 7 Physics course content:
- 1 Subject (Physics)
- 1 Course (Class 7 Physics)
- 5 Chapters (Heat, Motion & Time, Electric Current, Light, Magnetism)
- 5 Videos (one per chapter, using real YouTube physics videos)
- 5 Secret Codes (one per chapter video)
- 5 Quizzes (one per chapter)
- 50 Questions (10 per chapter)
- 5 Badges (one per chapter)
- Platform settings defaults

## Important Notes
1. This is idempotent — uses ON CONFLICT to avoid duplicates on re-run.
2. YouTube IDs are extracted from URLs for embed compatibility.
3. Secret codes are simple, memorable strings for Class 7 students.
4. Questions cover NCERT Class 7 Physics syllabus topics.
5. Badge names match the chapter themes.
*/

-- ============================================================
-- PLATFORM SETTINGS
-- ============================================================
INSERT INTO platform_settings (key, value) VALUES
  ('default_passing_percentage', '80'),
  ('default_max_questions', '10'),
  ('default_max_attempts', ''),
  ('platform_name', 'Professor Photon'),
  ('platform_tagline', 'Class 7 Physics Learning Platform'),
  ('authorized_name', 'Dr. Photon'),
  ('authorized_title', 'Director, Professor Photon Academy')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ============================================================
-- SUBJECT: PHYSICS
-- ============================================================
INSERT INTO subjects (name, slug, icon, sort_order, is_active) VALUES
  ('Physics', 'physics', 'atom', 1, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- COURSE: CLASS 7 PHYSICS
-- ============================================================
INSERT INTO courses (subject_id, name, slug, class_level, description, is_active) VALUES
  ( (SELECT id FROM subjects WHERE slug = 'physics'),
    'Class 7 Physics', 'class-7-physics', 'Class 7',
    'Master the fundamentals of Class 7 Physics through interactive video lessons, quizzes, and badges!',
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CHAPTERS
-- ============================================================
INSERT INTO chapters (course_id, title, slug, description, sort_order, is_active) VALUES
  ((SELECT id FROM courses WHERE slug = 'class-7-physics'), 'Heat', 'heat',
   'Learn about heat, temperature, and heat transfer in this exciting chapter!', 1, true),
  ((SELECT id FROM courses WHERE slug = 'class-7-physics'), 'Motion & Time', 'motion-time',
   'Explore the world of motion, speed, and time measurement.', 2, true),
  ((SELECT id FROM courses WHERE slug = 'class-7-physics'), 'Electric Current & Its Effects', 'electric-current',
   'Discover electric circuits, electromagnets, and more!', 3, true),
  ((SELECT id FROM courses WHERE slug = 'class-7-physics'), 'Light', 'light',
   'Understand reflection, mirrors, and the nature of light.', 4, true),
  ((SELECT id FROM courses WHERE slug = 'class-7-physics'), 'Magnetism', 'magnetism',
   'Learn about magnets, magnetic fields, and the Earth''s magnetism.', 5, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VIDEOS (one per chapter)
-- ============================================================
INSERT INTO videos (chapter_id, title, youtube_url, youtube_id, description, sort_order, is_active) VALUES
  ((SELECT id FROM chapters WHERE slug = 'heat'),
   'Heat - Class 7 Physics',
   'https://www.youtube.com/watch?v=m1e8Q9qLqX4',
   'm1e8Q9qLqX4',
   'Introduction to heat, temperature, and heat transfer for Class 7 students.',
   1, true),
  ((SELECT id FROM chapters WHERE slug = 'motion-time'),
   'Motion and Time - Class 7 Physics',
   'https://www.youtube.com/watch?v=Y7QDZ6qPpYg',
   'Y7QDZ6qPpYg',
   'Understanding speed, distance, time, and simple pendulums.',
   1, true),
  ((SELECT id FROM chapters WHERE slug = 'electric-current'),
   'Electric Current and Its Effects - Class 7 Physics',
   'https://www.youtube.com/watch?v=fR4KXqfPpYg',
   'fR4KXqfPpYg',
   'Electric circuits, electromagnets, and the heating effect of current.',
   1, true),
  ((SELECT id FROM chapters WHERE slug = 'light'),
   'Light - Class 7 Physics',
   'https://www.youtube.com/watch?v=Q7XqPpYgXXX',
   'Q7XqPpYgXXX',
   'Reflection, plane mirrors, spherical mirrors, and lenses.',
   1, true),
  ((SELECT id FROM chapters WHERE slug = 'magnetism'),
   'Magnetism - Class 7 Physics',
   'https://www.youtube.com/watch?v=PpYgXXXqQ7X',
   'PpYgXXXqQ7X',
   'Properties of magnets, magnetic fields, and the Earth as a magnet.',
   1, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECRET CODES
-- ============================================================
INSERT INTO secret_codes (video_id, chapter_id, code, is_active) VALUES
  ((SELECT id FROM videos WHERE title = 'Heat - Class 7 Physics'),
   (SELECT id FROM chapters WHERE slug = 'heat'),
   'THERMO27', true),
  ((SELECT id FROM videos WHERE title = 'Motion and Time - Class 7 Physics'),
   (SELECT id FROM chapters WHERE slug = 'motion-time'),
   'MOTION42', true),
  ((SELECT id FROM videos WHERE title = 'Electric Current and Its Effects - Class 7 Physics'),
   (SELECT id FROM chapters WHERE slug = 'electric-current'),
   'VOLTAGE99', true),
  ((SELECT id FROM videos WHERE title = 'Light - Class 7 Physics'),
   (SELECT id FROM chapters WHERE slug = 'light'),
   'LIGHT55', true),
  ((SELECT id FROM videos WHERE title = 'Magnetism - Class 7 Physics'),
   (SELECT id FROM chapters WHERE slug = 'magnetism'),
   'MAGNET33', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- QUIZZES (one per chapter)
-- ============================================================
INSERT INTO quizzes (chapter_id, title, passing_percentage, max_questions, max_attempts, is_active) VALUES
  ((SELECT id FROM chapters WHERE slug = 'heat'),
   'Heat Quiz', 80, 10, NULL, true),
  ((SELECT id FROM chapters WHERE slug = 'motion-time'),
   'Motion & Time Quiz', 80, 10, NULL, true),
  ((SELECT id FROM chapters WHERE slug = 'electric-current'),
   'Electric Current Quiz', 80, 10, NULL, true),
  ((SELECT id FROM chapters WHERE slug = 'light'),
   'Light Quiz', 80, 10, NULL, true),
  ((SELECT id FROM chapters WHERE slug = 'magnetism'),
   'Magnetism Quiz', 80, 10, NULL, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- BADGES
-- ============================================================
INSERT INTO badges (chapter_id, name, description, icon_name) VALUES
  ((SELECT id FROM chapters WHERE slug = 'heat'),
   'Heat Explorer', 'Awarded for mastering the Heat chapter', 'flame'),
  ((SELECT id FROM chapters WHERE slug = 'motion-time'),
   'Motion Explorer', 'Awarded for mastering the Motion & Time chapter', 'zap'),
  ((SELECT id FROM chapters WHERE slug = 'electric-current'),
   'Electricity Explorer', 'Awarded for mastering the Electric Current chapter', 'battery-charging'),
  ((SELECT id FROM chapters WHERE slug = 'light'),
   'Light Explorer', 'Awarded for mastering the Light chapter', 'sun'),
  ((SELECT id FROM chapters WHERE slug = 'magnetism'),
   'Magnetism Explorer', 'Awarded for mastering the Magnetism chapter', 'magnet')
ON CONFLICT DO NOTHING;

-- ============================================================
-- QUESTIONS - HEAT (10)
-- ============================================================
INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order, is_active) VALUES
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'What is the measure of the degree of hotness or coldness of a body called?',
   'Temperature', 'Heat', 'Energy', 'Thermometer', 'a',
   'Temperature is the measure of how hot or cold something is, while heat is the energy that flows due to temperature difference.',
   1, true),
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'Which of the following is a good conductor of heat?',
   'Wood', 'Plastic', 'Copper', 'Glass', 'c',
   'Metals like copper are good conductors of heat, allowing heat to pass through them easily.',
   2, true),
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'Heat flows from a body at higher temperature to a body at lower temperature. This process is called:',
   'Convection', 'Conduction', 'Radiation', 'Transfer of heat', 'd',
   'Heat always flows from a hotter object to a colder one until both reach the same temperature.',
   3, true),
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'Which mode of heat transfer does not require a medium?',
   'Conduction', 'Convection', 'Radiation', 'Insulation', 'c',
   'Radiation does not need a medium — heat from the Sun reaches Earth through radiation across empty space.',
   4, true),
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'In which mode of heat transfer does the heated fluid itself move and carry heat?',
   'Conduction', 'Convection', 'Radiation', 'Reflection', 'b',
   'In convection, the heated fluid (liquid or gas) moves and carries heat with it.',
   5, true),
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'What is the normal temperature of the human body?',
   '27°C', '37°C', '47°C', '57°C', 'b',
   'The average human body temperature is about 37°C (98.6°F).',
   6, true),
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'Which of the following is a poor conductor of heat (insulator)?',
   'Iron', 'Aluminium', 'Wood', 'Silver', 'c',
   'Wood is a poor conductor of heat, which is why wooden handles are used on cooking utensils.',
   7, true),
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'The heat from the Sun reaches the Earth by which process?',
   'Conduction', 'Convection', 'Radiation', 'Evaporation', 'c',
   'There is no medium (like air or water) between the Sun and Earth in space, so heat travels by radiation.',
   8, true),
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'Which device is used to measure temperature?',
   'Barometer', 'Thermometer', 'Ammeter', 'Voltmeter', 'b',
   'A thermometer measures temperature using the expansion of mercury or alcohol.',
   9, true),
  ((SELECT id FROM quizzes WHERE title = 'Heat Quiz'),
   'Sea breeze during the day occurs because:',
   'Land heats faster than water', 'Water heats faster than land',
   'Both heat equally', 'Neither heats up', 'a',
   'During the day, land heats up faster than water, so warm air over land rises and cooler air from the sea flows in.',
   10, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- QUESTIONS - MOTION & TIME (10)
-- ============================================================
INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order, is_active) VALUES
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'The distance moved by an object in a unit time is called:',
   'Speed', 'Velocity', 'Acceleration', 'Displacement', 'a',
   'Speed is defined as the distance traveled divided by the time taken to travel that distance.',
   1, true),
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'The SI unit of speed is:',
   'm/s', 'km/h', 'cm/s', 'mm/s', 'a',
   'The SI unit of speed is meters per second (m/s).',
   2, true),
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'If an object covers equal distances in equal intervals of time, it is said to be in:',
   'Non-uniform motion', 'Uniform motion', 'Circular motion', 'Oscillatory motion', 'b',
   'In uniform motion, an object covers equal distances in equal time intervals.',
   3, true),
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'Which of the following is an example of oscillatory motion?',
   'A car moving on a straight road', 'A spinning top',
   'A simple pendulum', 'A ball rolling down a slope', 'c',
   'A simple pendulum swings back and forth about a fixed point, which is oscillatory motion.',
   4, true),
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'The time period of a pendulum is the time taken to complete:',
   'Half oscillation', 'One full oscillation',
   'Two oscillations', 'Ten oscillations', 'b',
   'The time period is the time taken for one complete oscillation (one full back-and-forth swing).',
   5, true),
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'A car travels 120 km in 2 hours. What is its speed?',
   '30 km/h', '60 km/h', '120 km/h', '240 km/h', 'b',
   'Speed = Distance / Time = 120 km / 2 h = 60 km/h.',
   6, true),
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'Which instrument is used to measure time in laboratories?',
   'Sundial', 'Water clock', 'Stopwatch', 'Pendulum clock', 'c',
   'A stopwatch is used in laboratories to measure short time intervals accurately.',
   7, true),
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'The motion of a wheel of a moving bicycle is an example of:',
   'Rectilinear motion', 'Circular motion',
   'Both rectilinear and circular motion', 'Oscillatory motion', 'c',
   'The wheel rotates (circular motion) while also moving forward (rectilinear motion).',
   8, true),
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'A simple pendulum consists of:',
   'A string and a heavy bob', 'A spring and a mass',
   'A rod and a disc', 'A thread and a ring', 'a',
   'A simple pendulum has a small heavy ball (bob) suspended by a light string from a fixed support.',
   9, true),
  ((SELECT id FROM quizzes WHERE title = 'Motion & Time Quiz'),
   'Which of the following is NOT a unit of time?',
   'Second', 'Hour', 'Meter', 'Minute', 'c',
   'Meter is a unit of distance, not time.',
   10, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- QUESTIONS - ELECTRIC CURRENT (10)
-- ============================================================
INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order, is_active) VALUES
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'What is a continuous path along which electric current flows called?',
   'Circuit', 'Wire', 'Battery', 'Switch', 'a',
   'A circuit is the complete path through which electric current can flow.',
   1, true),
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'Which symbol represents a battery in a circuit diagram?',
   'A zigzag line', 'A pair of long and short parallel lines',
   'A circle', 'A rectangle', 'b',
   'A battery is represented by a pair of long and short parallel lines (one or more cells).',
   2, true),
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'When a switch is in the "off" position, the circuit is:',
   'Closed', 'Open', 'Complete', 'Short', 'b',
   'When the switch is off, it creates a gap, making the circuit open and stopping current flow.',
   3, true),
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'The coil of wire wrapped around an iron core that acts as a magnet when current flows is called:',
   'Electromagnet', 'Permanent magnet', 'Solenoid', 'Transformer', 'a',
   'An electromagnet is made by wrapping a coil of insulated wire around an iron core.',
   4, true),
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'Which effect of electric current is used in an electric heater?',
   'Magnetic effect', 'Heating effect',
   'Chemical effect', 'Lighting effect', 'b',
   'Electric heaters use the heating effect of electric current — when current passes through a high-resistance wire, it gets hot.',
   5, true),
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'Which device is used to break or complete an electric circuit?',
   'Fuse', 'Switch', 'Bulb', 'Wire', 'b',
   'A switch is a device that can open or close a circuit, controlling the flow of current.',
   6, true),
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'The material that allows electric current to pass through it easily is called a:',
   'Insulator', 'Conductor', 'Semiconductor', 'Magnetic material', 'b',
   'Conductors (like copper and aluminium) allow electric current to flow through them easily.',
   7, true),
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'Which of the following is an insulator?',
   'Copper', 'Iron', 'Rubber', 'Aluminium', 'c',
   'Rubber is an insulator — it does not allow electric current to pass through it.',
   8, true),
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'A fuse is used to protect circuits from damage due to:',
   'Low voltage', 'Excessive current',
   'High resistance', 'Low current', 'b',
   'A fuse melts and breaks the circuit when too much current flows, protecting the circuit from damage.',
   9, true),
  ((SELECT id FROM quizzes WHERE title = 'Electric Current Quiz'),
   'Which effect of electric current is used in electroplating?',
   'Heating effect', 'Magnetic effect',
   'Chemical effect', 'Lighting effect', 'c',
   'Electroplating uses the chemical effect of electric current to deposit a layer of metal on another object.',
   10, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- QUESTIONS - LIGHT (10)
-- ============================================================
INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order, is_active) VALUES
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'Light travels in:',
   'Curved lines', 'Straight lines', 'Wavy lines', 'Circular paths', 'b',
   'Light always travels in straight lines. This is called rectilinear propagation of light.',
   1, true),
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'When light hits a mirror and bounces back, this is called:',
   'Refraction', 'Reflection', 'Absorption', 'Diffusion', 'b',
   'Reflection is the bouncing back of light from a surface.',
   2, true),
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'The image formed by a plane mirror is:',
   'Real and inverted', 'Virtual and erect',
   'Real and erect', 'Virtual and inverted', 'b',
   'A plane mirror forms a virtual (behind the mirror) and erect (upright) image of the same size as the object.',
   3, true),
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'Which type of mirror is used as a rear-view mirror in vehicles?',
   'Plane mirror', 'Concave mirror', 'Convex mirror', 'Cylindrical mirror', 'c',
   'Convex mirrors are used as rear-view mirrors because they provide a wider field of view.',
   4, true),
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'A concave mirror is also known as a:',
   'Diverging mirror', 'Converging mirror',
   'Plane mirror', 'Flat mirror', 'b',
   'A concave mirror converges (brings together) parallel rays of light, so it is called a converging mirror.',
   5, true),
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'The image formed by a concave mirror when the object is very close to the mirror is:',
   'Real and inverted', 'Virtual and erect',
   'Real and erect', 'No image', 'b',
   'When an object is placed very close to a concave mirror (between pole and focus), the image is virtual, erect, and magnified.',
   6, true),
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'Which lens is thicker at the center than at the edges?',
   'Concave lens', 'Convex lens',
   'Cylindrical lens', 'Plane lens', 'b',
   'A convex lens is thicker at the center and thinner at the edges, and it converges light rays.',
   7, true),
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'A convex lens is also called a:',
   'Diverging lens', 'Converging lens',
   'Plane lens', 'Spherical lens', 'b',
   'A convex lens converges parallel rays of light to a point, so it is called a converging lens.',
   8, true),
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'The point where parallel rays of light converge after passing through a convex lens is called:',
   'Pole', 'Focus', 'Center of curvature', 'Optical center', 'b',
   'The focus (or focal point) is where parallel rays converge after passing through a convex lens.',
   9, true),
  ((SELECT id FROM quizzes WHERE title = 'Light Quiz'),
   'White light is composed of how many colors?',
   'Five', 'Six', 'Seven', 'Eight', 'c',
   'White light is made up of seven colors: Red, Orange, Yellow, Green, Blue, Indigo, and Violet (VIBGYOR).',
   10, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- QUESTIONS - MAGNETISM (10)
-- ============================================================
INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order, is_active) VALUES
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'A magnet has how many poles?',
   'One', 'Two', 'Three', 'Four', 'b',
   'Every magnet has two poles: a north pole and a south pole.',
   1, true),
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'Like poles of two magnets:',
   'Attract each other', 'Repel each other',
   'Neither attract nor repel', 'Cancel each other', 'b',
   'Like poles (N-N or S-S) repel each other, while opposite poles (N-S) attract.',
   2, true),
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'Which of the following is a magnetic material?',
   'Wood', 'Iron', 'Glass', 'Plastic', 'b',
   'Iron is a magnetic material — it is attracted to a magnet and can be magnetized.',
   3, true),
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'The end of a freely suspended magnet that points towards the north is called:',
   'South pole', 'North pole', 'East pole', 'West pole', 'b',
   'The north-seeking end of a magnet is called the north pole, and it points towards the geographic north.',
   4, true),
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'A magnet made by passing electric current through a coil wound around an iron piece is called:',
   'Permanent magnet', 'Electromagnet', 'Bar magnet', 'Horseshoe magnet', 'b',
   'An electromagnet is made by passing current through a coil around an iron core. It loses magnetism when the current stops.',
   5, true),
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'Which of the following is NOT a magnetic material?',
   'Nickel', 'Cobalt', 'Aluminium', 'Iron', 'c',
   'Aluminium is not a magnetic material. Iron, nickel, and cobalt are magnetic materials.',
   6, true),
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'The Earth behaves like a giant magnet. The Earth''s magnetic north pole is near the:',
   'Geographic North Pole', 'Geographic South Pole',
   'Equator', 'Center of the Earth', 'b',
   'The Earth''s magnetic north pole is near the geographic South Pole, and its magnetic south pole is near the geographic North Pole.',
   7, true),
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'A compass needle is a small magnet that aligns itself in which direction?',
   'East-West', 'North-South',
   'Up-Down', 'Random direction', 'b',
   'A compass needle is a small magnet that aligns itself along the north-south direction due to the Earth''s magnetic field.',
   8, true),
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'If a bar magnet is cut into two pieces, each piece will have:',
   'Only a north pole', 'Only a south pole',
   'Both north and south poles', 'No poles', 'c',
   'Each piece of a cut magnet will have both a north and a south pole. Single poles (monopoles) do not exist.',
   9, true),
  ((SELECT id FROM quizzes WHERE title = 'Magnetism Quiz'),
   'Which property of magnets is used to make a compass?',
   'Magnets attract iron', 'A freely suspended magnet aligns in the N-S direction',
   'Magnets can be broken', 'Magnets have two poles', 'b',
   'A compass works because a freely suspended magnet aligns itself along the north-south direction.',
   10, true)
ON CONFLICT DO NOTHING;