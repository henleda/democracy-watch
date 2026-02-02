-- Industry Taxonomy for Campaign Finance Classification
-- Based on docs/INDUSTRY_TAXONOMY.md
-- 17 Sectors, 52 Industries

-- Sectors (parent categories)
INSERT INTO finance.ref_sectors (code, name, description, display_order) VALUES
('AGRI', 'Agriculture & Food', 'Farming, food production, agricultural services', 1),
('ENGY', 'Energy', 'Oil, gas, utilities, renewables, mining', 2),
('FNCE', 'Finance & Insurance', 'Banking, investments, insurance, real estate', 3),
('HLTH', 'Healthcare', 'Hospitals, pharmaceuticals, health insurance, medical devices', 4),
('TECH', 'Technology', 'Software, hardware, telecom, IT services', 5),
('DEFN', 'Defense & Aerospace', 'Defense contractors, aerospace, military services', 6),
('CNST', 'Construction & Real Estate', 'Construction, building materials, architecture', 7),
('TRAN', 'Transportation', 'Airlines, automotive, trucking, railroads', 8),
('RETL', 'Retail & Consumer', 'Retail stores, restaurants, consumer products', 9),
('MEDA', 'Media & Entertainment', 'Broadcasting, publishing, film, advertising, gaming', 10),
('LAW', 'Legal', 'Law firms, lobbying', 11),
('EDUC', 'Education', 'Higher education, K-12, EdTech', 12),
('LABR', 'Labor & Unions', 'Labor unions, professional associations', 13),
('GOVT', 'Government', 'Federal, state, local government employees', 14),
('MISC', 'Miscellaneous', 'Religious organizations, nonprofits, unclassifiable', 15),
('RETD', 'Retired', 'Retired individuals', 16),
('NOTW', 'Not Working', 'Unemployed, homemakers, students', 17)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- Industries (child categories)
INSERT INTO finance.ref_industries (code, name, sector_code, description, display_order) VALUES
-- Agriculture & Food
('AGRI01', 'Crop Production', 'AGRI', 'Farms, orchards, vineyards, agricultural cooperatives', 1),
('AGRI02', 'Livestock & Dairy', 'AGRI', 'Ranches, dairy farms, poultry, meat processing', 2),
('AGRI03', 'Food & Beverage Manufacturing', 'AGRI', 'Food processors, beverage companies, packaged goods', 3),
('AGRI04', 'Agricultural Services', 'AGRI', 'Farm equipment, seeds, fertilizers, agricultural tech', 4),

-- Energy
('ENGY01', 'Oil & Gas', 'ENGY', 'Exploration, production, refining, pipelines', 1),
('ENGY02', 'Coal & Mining', 'ENGY', 'Coal mining, mineral extraction', 2),
('ENGY03', 'Electric Utilities', 'ENGY', 'Power generation, transmission, distribution', 3),
('ENGY04', 'Renewable Energy', 'ENGY', 'Solar, wind, hydroelectric, geothermal', 4),
('ENGY05', 'Nuclear', 'ENGY', 'Nuclear power generation, uranium mining', 5),

-- Finance & Insurance
('FNCE01', 'Commercial Banks', 'FNCE', 'Retail and commercial banking', 1),
('FNCE02', 'Investment & Securities', 'FNCE', 'Investment banks, brokerages, asset management', 2),
('FNCE03', 'Insurance', 'FNCE', 'Life, health, property, casualty insurance', 3),
('FNCE04', 'Real Estate', 'FNCE', 'REITs, property development, real estate services', 4),
('FNCE05', 'Private Equity & Hedge Funds', 'FNCE', 'Alternative investments, venture capital', 5),
('FNCE06', 'Fintech & Payments', 'FNCE', 'Payment processors, digital banking, cryptocurrency', 6),

-- Healthcare
('HLTH01', 'Hospitals & Health Systems', 'HLTH', 'Hospitals, clinics, health networks', 1),
('HLTH02', 'Pharmaceuticals', 'HLTH', 'Drug manufacturers, biotech', 2),
('HLTH03', 'Medical Devices', 'HLTH', 'Device manufacturers, diagnostics', 3),
('HLTH04', 'Health Insurance', 'HLTH', 'Health insurers, managed care', 4),
('HLTH05', 'Healthcare Services', 'HLTH', 'Nursing homes, home health, labs', 5),
('HLTH06', 'Physicians & Clinicians', 'HLTH', 'Doctors, dentists, nurses (individual practitioners)', 6),

-- Technology
('TECH01', 'Software & Internet', 'TECH', 'Software companies, internet platforms, SaaS', 1),
('TECH02', 'Hardware & Electronics', 'TECH', 'Computer hardware, consumer electronics, chips', 2),
('TECH03', 'Telecommunications', 'TECH', 'Phone carriers, cable, ISPs, 5G', 3),
('TECH04', 'IT Services', 'TECH', 'Consulting, system integrators, managed services', 4),
('TECH05', 'Artificial Intelligence', 'TECH', 'AI/ML companies, robotics, automation', 5),

-- Defense & Aerospace
('DEFN01', 'Defense Contractors', 'DEFN', 'Weapons systems, military equipment', 1),
('DEFN02', 'Aerospace', 'DEFN', 'Aircraft manufacturers, space companies', 2),
('DEFN03', 'Defense Services', 'DEFN', 'Military support services, security contractors', 3),

-- Construction & Real Estate
('CNST01', 'Construction', 'CNST', 'General contractors, homebuilders, infrastructure', 1),
('CNST02', 'Building Materials', 'CNST', 'Lumber, cement, steel, building products', 2),
('CNST03', 'Architecture & Engineering', 'CNST', 'Design firms, engineering services', 3),

-- Transportation
('TRAN01', 'Airlines', 'TRAN', 'Passenger and cargo airlines', 1),
('TRAN02', 'Automotive', 'TRAN', 'Car manufacturers, dealers, parts suppliers', 2),
('TRAN03', 'Trucking & Logistics', 'TRAN', 'Freight, shipping, warehousing', 3),
('TRAN04', 'Railroads', 'TRAN', 'Freight and passenger rail', 4),
('TRAN05', 'Ride-sharing & Delivery', 'TRAN', 'Uber, Lyft, DoorDash, gig economy transportation', 5),

-- Retail & Consumer
('RETL01', 'General Retail', 'RETL', 'Department stores, big box, e-commerce', 1),
('RETL02', 'Restaurants & Hospitality', 'RETL', 'Restaurants, hotels, entertainment venues', 2),
('RETL03', 'Consumer Products', 'RETL', 'CPG, apparel, household goods manufacturers', 3),

-- Media & Entertainment
('MEDA01', 'Broadcasting & Cable', 'MEDA', 'TV networks, cable channels, streaming', 1),
('MEDA02', 'Publishing & Print', 'MEDA', 'Newspapers, magazines, book publishers', 2),
('MEDA03', 'Film & Music', 'MEDA', 'Studios, record labels, production companies', 3),
('MEDA04', 'Advertising & Marketing', 'MEDA', 'Ad agencies, PR firms, digital marketing', 4),
('MEDA05', 'Gaming & Sports', 'MEDA', 'Video games, professional sports, gambling', 5),

-- Legal
('LAW01', 'Law Firms', 'LAW', 'Attorneys, law practices', 1),
('LAW02', 'Lobbying', 'LAW', 'Registered lobbyists, government relations', 2),

-- Education
('EDUC01', 'Higher Education', 'EDUC', 'Universities, colleges, community colleges', 1),
('EDUC02', 'K-12 Education', 'EDUC', 'Public schools, private schools, school districts', 2),
('EDUC03', 'For-Profit Education', 'EDUC', 'For-profit colleges, vocational training, EdTech', 3),

-- Labor & Unions
('LABR01', 'Labor Unions', 'LABR', 'AFL-CIO, SEIU, trade unions, teachers unions', 1),
('LABR02', 'Professional Associations', 'LABR', 'Industry groups, professional societies', 2),

-- Government
('GOVT01', 'Federal Government', 'GOVT', 'Federal employees (civilian)', 1),
('GOVT02', 'State & Local Government', 'GOVT', 'State, county, city employees', 2),
('GOVT03', 'Military', 'GOVT', 'Active duty, reserves, National Guard', 3),
('GOVT04', 'Postal Service', 'GOVT', 'USPS employees', 4),

-- Miscellaneous
('MISC01', 'Unknown/Unclassifiable', 'MISC', 'Cannot determine from available information', 1),
('MISC02', 'Religious Organizations', 'MISC', 'Churches, religious nonprofits, clergy', 2),
('MISC03', 'Nonprofits & NGOs', 'MISC', 'Charities, foundations, advocacy groups', 3),
('MISC04', 'Other', 'MISC', 'Does not fit other categories', 4),

-- Retired
('RETD01', 'Retired', 'RETD', 'No longer employed, living on retirement income', 1),

-- Not Working
('NOTW01', 'Not Employed', 'NOTW', 'Unemployed, homemaker, not in workforce', 1),
('NOTW02', 'Student', 'NOTW', 'Full-time students', 2)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    sector_code = EXCLUDED.sector_code,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;
