"""
generate_garage_assets.py — Procedural 3D CAD modeling of F1 Garages & Pit Lane
Generates high-fidelity PBR assets for Unity 6 HDRP via Blender (bpy).
Adheres strictly to the piecewise-3d-cad protocol.

Outputs to: unity_pits/Assets/Models/
- PitBuilding_32Bays.fbx
- Hero_RedBull_Garage.fbx
- PitLane_Gantry_Boom.fbx
- PitWall_Command_Perch.fbx
"""

import bpy
import bmesh
import math
import os

# 1. Output directory setup
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../unity_pits/Assets/Models'))
os.makedirs(OUTPUT_DIR, exist_ok=True)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0  # 1 unit = 1 meter

def create_material(name, color, roughness=0.5, metallic=0.0, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color[:3], 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if emission:
            # Blender 4+ Principled BSDF has 'Emission Color' and 'Emission Strength'
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = (*emission[:3], 1.0)
                bsdf.inputs['Emission Strength'].default_value = emission_strength
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = (*emission[:3], 1.0)
    return mat

def export_active_to_fbx(filepath):
    bpy.ops.export_scene.fbx(
        filepath=filepath,
        use_selection=False,
        apply_unit_scale=True,
        apply_scale_options='FBX_SCALE_ALL',
        axis_forward='-Z',
        axis_up='Y'
    )
    print(f"Exported FBX: {filepath} ({os.path.getsize(filepath):,} bytes)")

# =========================================================================
# ASSET 1: Pit Building Shell & 32 Team Garage Bays
# =========================================================================
def build_pit_building():
    reset_scene()
    
    # 2026 Grid Data (Austrian GP Order)
    TEAMS = [
        {"name": "FIA Scrutineering", "color": [0.15, 0.15, 0.18], "bays": 3},
        {"name": "FOM Broadcast", "color": [0.12, 0.12, 0.15], "bays": 1},
        {"name": "Marshals & Walkway", "color": [0.18, 0.20, 0.22], "bays": 1},
        {"name": "McLaren F1 Team", "color": [0.957, 0.463, 0.0], "bays": 3},        # Papaya #F47600
        {"name": "Mercedes-AMG Petronas", "color": [0.0, 0.843, 0.714], "bays": 3},  # Cyan #00D7B6
        {"name": "Red Bull Racing", "color": [0.098, 0.137, 0.333], "bays": 3},       # Navy #192355
        {"name": "Scuderia Ferrari", "color": [0.929, 0.067, 0.192], "bays": 3},      # Rosso #ED1131
        {"name": "Williams Racing", "color": [0.094, 0.408, 0.859], "bays": 3},       # Blue #1868DB
        {"name": "Racing Bulls", "color": [0.424, 0.596, 1.0], "bays": 3},            # Blue #6C98FF
        {"name": "Aston Martin Aramco", "color": [0.133, 0.600, 0.443], "bays": 3},   # Green #229971
        {"name": "Haas F1 Team", "color": [0.612, 0.624, 0.635], "bays": 3},          # Slate #9C9FA2
        {"name": "Audi F1 Team", "color": [0.961, 0.020, 0.216], "bays": 3},          # Red #F50537
        {"name": "BWT Alpine F1 Team", "color": [0.0, 0.631, 0.910], "bays": 3},      # Blue #00A1E8
        {"name": "Cadillac F1 Team", "color": [0.565, 0.565, 0.565], "bays": 3},      # Silver #909090
    ]
    
    total_len = 305.3  # meters from OSM Red Bull Ring data
    depth = 27.4
    height = 14.0      # ground floor garages + 2 upper VIP hospitality floors
    bay_height = 4.2
    bay_width = total_len / 32.0  # ~9.54m per bay
    
    # Materials
    mat_concrete = create_material("Mat_PitBuilding_Concrete", [0.75, 0.76, 0.78], roughness=0.7)
    mat_glass = create_material("Mat_VIP_Glass", [0.15, 0.25, 0.35], roughness=0.1, metallic=0.9)
    mat_roof = create_material("Mat_Overhang_Roof", [0.20, 0.22, 0.25], roughness=0.4, metallic=0.6)
    mat_frame = create_material("Mat_DoorFrame_Steel", [0.12, 0.13, 0.15], roughness=0.3, metallic=0.8)
    mat_epoxy = create_material("Mat_Garage_Epoxy_Floor", [0.82, 0.84, 0.86], roughness=0.08, metallic=0.05)
    mat_shutter = create_material("Mat_Roller_Shutter", [0.45, 0.48, 0.52], roughness=0.5, metallic=0.4)
    
    # Main Ground Floor Mass
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    building = bpy.context.active_object
    building.name = "Body_PitBuilding_Main"
    building.scale = (total_len, depth, height)
    building.location = (0, depth / 2.0, height / 2.0)
    bpy.ops.object.transform_apply(location=True, scale=True)
    building.data.materials.append(mat_concrete)
    
    # VIP Glass Upper Floors
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    vip = bpy.context.active_object
    vip.name = "Glass_VIP_PaddockClub"
    vip.scale = (total_len - 4.0, depth - 4.0, 7.5)
    vip.location = (0, depth / 2.0 - 1.0, height - 2.5)
    bpy.ops.object.transform_apply(location=True, scale=True)
    vip.data.materials.append(mat_glass)
    
    # Cantilevered Roof Slab
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    roof = bpy.context.active_object
    roof.name = "Body_PitBuilding_RoofCanopy"
    roof.scale = (total_len + 8.0, depth + 8.0, 1.2)
    roof.location = (0, depth / 2.0, height + 0.6)
    bpy.ops.object.transform_apply(location=True, scale=True)
    roof.data.materials.append(mat_roof)
    
    # Garage Bay Facades & Header Boards
    current_bay = 0
    start_x = -total_len / 2.0
    
    for t_idx, team in enumerate(TEAMS):
        team_color = team["color"]
        mat_team_header = create_material(f"Mat_Header_{team['name'].replace(' ', '_')}", team_color, roughness=0.3, metallic=0.2)
        
        for b in range(team["bays"]):
            bx = start_x + (current_bay + 0.5) * bay_width
            is_hero_bay = (team["name"] == "Red Bull Racing" and b == 1) # Central Red Bull bay is open
            
            # Recessed Door Frame
            bpy.ops.mesh.primitive_cube_add(size=1.0)
            frame = bpy.context.active_object
            frame.name = f"Frame_Bay_{current_bay:02d}_{team['name'].replace(' ', '_')}"
            frame.scale = (bay_width - 0.4, 0.4, bay_height)
            frame.location = (bx, 0.2, bay_height / 2.0)
            bpy.ops.object.transform_apply(location=True, scale=True)
            frame.data.materials.append(mat_frame)
            
            # Team Header Board (Above door)
            bpy.ops.mesh.primitive_cube_add(size=1.0)
            header = bpy.context.active_object
            header.name = f"Header_Bay_{current_bay:02d}_{team['name'].replace(' ', '_')}"
            header.scale = (bay_width - 0.6, 0.25, 0.9)
            header.location = (bx, -0.05, bay_height + 0.5)
            bpy.ops.object.transform_apply(location=True, scale=True)
            header.data.materials.append(mat_team_header)
            
            # Roller Shutter (closed for others, wide open for Hero Red Bull)
            if not is_hero_bay:
                bpy.ops.mesh.primitive_cube_add(size=1.0)
                shutter = bpy.context.active_object
                shutter.name = f"Shutter_Bay_{current_bay:02d}"
                shutter_h = bay_height - 0.2
                shutter.scale = (bay_width - 0.8, 0.1, shutter_h)
                shutter.location = (bx, 0.3, shutter_h / 2.0)
                bpy.ops.object.transform_apply(location=True, scale=True)
                shutter.data.materials.append(mat_shutter)
            else:
                # Open Hero Bay: High-gloss epoxy floor inside
                bpy.ops.mesh.primitive_plane_add(size=1.0)
                floor = bpy.context.active_object
                floor.name = "Floor_Hero_RedBull_Epoxy"
                floor.scale = (bay_width * 3.0, depth * 0.8, 1.0)
                floor.location = (bx, depth * 0.4, 0.02)
                bpy.ops.object.transform_apply(location=True, scale=True)
                floor.data.materials.append(mat_epoxy)
                
            current_bay += 1

    export_active_to_fbx(os.path.join(OUTPUT_DIR, "PitBuilding_32Bays.fbx"))

# =========================================================================
# ASSET 2: Hero Red Bull Racing Garage Interior Equipment Kit
# =========================================================================
def build_hero_garage():
    reset_scene()
    
    mat_rbr_navy = create_material("Mat_RBR_Navy", [0.098, 0.137, 0.333], roughness=0.35, metallic=0.1)
    mat_rbr_red = create_material("Mat_RBR_Red", [0.855, 0.145, 0.125], roughness=0.3)
    mat_rbr_yellow = create_material("Mat_RBR_Yellow", [0.965, 0.722, 0.0], roughness=0.3)
    mat_carbon = create_material("Mat_Carbon_Fiber", [0.08, 0.08, 0.09], roughness=0.25, metallic=0.3)
    mat_steel = create_material("Mat_Polished_Steel", [0.8, 0.82, 0.85], roughness=0.2, metallic=0.95)
    mat_screen = create_material("Mat_Telemetry_LCD", [0.02, 0.03, 0.05], roughness=0.1, emission=[0.0, 0.83, 1.0], emission_strength=3.5)
    mat_lightbox = create_material("Mat_Overhead_LED_Panel", [0.95, 0.98, 1.0], roughness=0.1, emission=[1.0, 1.0, 1.0], emission_strength=5.0)
    mat_rubber = create_material("Mat_Tire_Rubber", [0.12, 0.12, 0.13], roughness=0.85)
    mat_blanket = create_material("Mat_Tire_Blanket_Heater", [0.15, 0.16, 0.18], roughness=0.6, emission=[0.9, 0.2, 0.0], emission_strength=0.8)
    
    # 1. Overhead LED Lightbox Rig
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    rig_frame = bpy.context.active_object
    rig_frame.name = "Frame_Overhead_LightRig"
    rig_frame.scale = (7.5, 5.0, 0.25)
    rig_frame.location = (0, 7.0, 3.8)
    bpy.ops.object.transform_apply(location=True, scale=True)
    rig_frame.data.materials.append(mat_carbon)
    
    # LED light diffusers
    for panel in range(4):
        px = -2.7 + panel * 1.8
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        led = bpy.context.active_object
        led.name = f"UI_LED_Panel_{panel}"
        led.scale = (1.4, 4.4, 0.08)
        led.location = (px, 7.0, 3.65)
        bpy.ops.object.transform_apply(location=True, scale=True)
        led.data.materials.append(mat_lightbox)
        
    # 2. Car Chassis Stands (Front & Rear)
    for pos_y, name in [(5.2, "Front"), (8.8, "Rear")]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.7)
        stand = bpy.context.active_object
        stand.name = f"Stand_Chassis_{name}"
        stand.location = (0, pos_y, 0.35)
        bpy.ops.object.transform_apply(location=True)
        stand.data.materials.append(mat_steel)
        
        # Horizontal cradle bar
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        bar = bpy.context.active_object
        bar.name = f"Cradle_Chassis_{name}"
        bar.scale = (1.1, 0.12, 0.06)
        bar.location = (0, pos_y, 0.7)
        bpy.ops.object.transform_apply(location=True, scale=True)
        bar.data.materials.append(mat_rbr_navy)
        
    # 3. Rolling Telemetry Engineer Consoles (LH & RH)
    for side, sx in [(-1, -3.2), (1, 3.2)]:
        sname = "LH" if side < 0 else "RH"
        # Console cart desk
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        cart = bpy.context.active_object
        cart.name = f"Body_TelemetryCart_{sname}"
        cart.scale = (1.8, 1.0, 1.1)
        cart.location = (sx, 7.0, 0.55)
        bpy.ops.object.transform_apply(location=True, scale=True)
        cart.data.materials.append(mat_carbon)
        
        # 3x Telemetry Displays on riser
        for m in range(3):
            mx = sx - 0.5 + m * 0.5
            bpy.ops.mesh.primitive_cube_add(size=1.0)
            mon = bpy.context.active_object
            mon.name = f"UI_LCD_Telemetry_{sname}_{m}"
            mon.scale = (0.46, 0.04, 0.28)
            mon.location = (mx, 7.3, 1.35)
            bpy.ops.object.transform_apply(location=True, scale=True)
            mon.data.materials.append(mat_screen)
            
    # 4. Heated Tire Stacks in Warmers (Soft, Medium, Hard)
    compounds = [
        {"name": "Soft", "color": [0.855, 0.145, 0.125], "x": -2.8, "y": 11.5},
        {"name": "Medium", "color": [0.965, 0.722, 0.0], "x": 0.0, "y": 11.5},
        {"name": "Hard", "color": [0.9, 0.9, 0.9], "x": 2.8, "y": 11.5}
    ]
    for comp in compounds:
        # 4 stacked tires with heating blankets
        for t in range(4):
            bpy.ops.mesh.primitive_cylinder_add(radius=0.36, depth=0.38)
            tire = bpy.context.active_object
            tire.name = f"TireStack_{comp['name']}_{t}"
            tire.location = (comp["x"], comp["y"], 0.19 + t * 0.40)
            bpy.ops.object.transform_apply(location=True)
            tire.data.materials.append(mat_blanket)
            
    # 5. Heavy-Duty Lista Tool Cabinets (Rear Wall)
    for c_idx in range(4):
        cx = -3.0 + c_idx * 2.0
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        cab = bpy.context.active_object
        cab.name = f"Body_ToolCabinet_{c_idx}"
        cab.scale = (1.7, 0.8, 1.4)
        cab.location = (cx, 13.5, 0.7)
        bpy.ops.object.transform_apply(location=True, scale=True)
        cab.data.materials.append(mat_rbr_navy)

    export_active_to_fbx(os.path.join(OUTPUT_DIR, "Hero_RedBull_Garage.fbx"))

# =========================================================================
# ASSET 3: Pit Lane Gantry Boom & Traffic Release Light Pod
# =========================================================================
def build_pit_gantry():
    reset_scene()
    
    mat_carbon = create_material("Mat_Gantry_Carbon", [0.1, 0.1, 0.11], roughness=0.3)
    mat_steel = create_material("Mat_Gantry_Steel", [0.75, 0.76, 0.78], roughness=0.2, metallic=0.9)
    mat_hose = create_material("Mat_Air_Hose_Yellow", [0.95, 0.75, 0.05], roughness=0.5)
    mat_light_green = create_material("Mat_Release_Green", [0.0, 1.0, 0.2], roughness=0.1, emission=[0.0, 1.0, 0.2], emission_strength=8.0)
    mat_light_red = create_material("Mat_Release_Red", [1.0, 0.05, 0.05], roughness=0.1, emission=[1.0, 0.05, 0.05], emission_strength=8.0)
    
    # 1. Main Pivot Mounting Bracket on Garage Wall
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    mount = bpy.context.active_object
    mount.name = "Mount_Gantry_Wall"
    mount.scale = (0.6, 0.6, 1.2)
    mount.location = (0, 0, 4.5)
    bpy.ops.object.transform_apply(location=True, scale=True)
    mount.data.materials.append(mat_steel)
    
    # 2. Horizontal Cantilevered Boom Arm (4.8 m outward span over pit box)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=4.8)
    boom = bpy.context.active_object
    boom.name = "Boom_Gantry_Arm"
    boom.rotation_euler = (math.radians(90), 0, 0)
    boom.location = (0, -2.4, 4.8)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    boom.data.materials.append(mat_carbon)
    
    # Tension support cable
    bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=4.0)
    cable = bpy.context.active_object
    cable.name = "Cable_Gantry_Support"
    cable.rotation_euler = (math.radians(65), 0, 0)
    cable.location = (0, -1.8, 5.2)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    cable.data.materials.append(mat_steel)
    
    # 3. FIA Driver Release Light Pod (suspended at tip of boom)
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    pod = bpy.context.active_object
    pod.name = "Body_ReleaseLight_Pod"
    pod.scale = (0.35, 0.25, 0.55)
    pod.location = (0, -4.6, 4.3)
    bpy.ops.object.transform_apply(location=True, scale=True)
    pod.data.materials.append(mat_carbon)
    
    # Red Stop Light (Top)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.06)
    l_red = bpy.context.active_object
    l_red.name = "LED_Release_Red"
    l_red.rotation_euler = (math.radians(90), 0, 0)
    l_red.location = (0, -4.73, 4.45)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    l_red.data.materials.append(mat_light_red)
    
    # Green Go Light (Bottom)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=0.06)
    l_green = bpy.context.active_object
    l_green.name = "LED_Release_Green"
    l_green.rotation_euler = (math.radians(90), 0, 0)
    l_green.location = (0, -4.73, 4.15)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    l_green.data.materials.append(mat_light_green)
    
    # 4. Pneumatic Air Hose Drops for Wheel Guns
    for corner_x, corner_y in [(-1.2, -3.8), (1.2, -3.8), (-1.2, -5.2), (1.2, -5.2)]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=2.4)
        hose = bpy.context.active_object
        hose.name = "Hose_WheelGun_Drop"
        hose.location = (corner_x, corner_y, 3.2)
        bpy.ops.object.transform_apply(location=True)
        hose.data.materials.append(mat_hose)
        
    export_active_to_fbx(os.path.join(OUTPUT_DIR, "PitLane_Gantry_Boom.fbx"))

# =========================================================================
# ASSET 4: Pit Wall Command Perch
# =========================================================================
def build_pit_wall_perch():
    reset_scene()
    
    mat_rbr_navy = create_material("Mat_Perch_Navy", [0.098, 0.137, 0.333], roughness=0.35)
    mat_rbr_red = create_material("Mat_Perch_Red", [0.855, 0.145, 0.125], roughness=0.3)
    mat_carbon = create_material("Mat_Perch_Carbon", [0.1, 0.1, 0.12], roughness=0.25)
    mat_screen = create_material("Mat_Perch_Displays", [0.02, 0.03, 0.05], roughness=0.1, emission=[0.1, 0.7, 0.9], emission_strength=3.0)
    mat_canopy = create_material("Mat_Perch_Canopy", [0.15, 0.16, 0.18], roughness=0.5)
    mat_concrete = create_material("Mat_PitWall_Concrete", [0.72, 0.74, 0.76], roughness=0.8)
    
    # 1. Concrete Pit Wall Barrier Section (8.0 m long, 1.1 m high, 0.6 m thick)
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    wall = bpy.context.active_object
    wall.name = "Body_PitWall_Barrier"
    wall.scale = (8.0, 0.6, 1.1)
    wall.location = (0, 0, 0.55)
    bpy.ops.object.transform_apply(location=True, scale=True)
    wall.data.materials.append(mat_concrete)
    
    # 2. Perch Platform (Elevated floor behind wall)
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    plat = bpy.context.active_object
    plat.name = "Body_Perch_Platform"
    plat.scale = (7.6, 2.2, 0.15)
    plat.location = (0, 1.2, 0.85)
    bpy.ops.object.transform_apply(location=True, scale=True)
    plat.data.materials.append(mat_carbon)
    
    # 3. Weather Protection Canopy Roof
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    roof = bpy.context.active_object
    roof.name = "Body_Perch_Canopy"
    roof.scale = (7.8, 2.4, 0.12)
    roof.location = (0, 1.1, 2.65)
    bpy.ops.object.transform_apply(location=True, scale=True)
    roof.data.materials.append(mat_canopy)
    
    # 4. Multi-Monitor Telemetry Banks (6 console screens)
    for m in range(6):
        mx = -3.0 + m * 1.2
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        scr = bpy.context.active_object
        scr.name = f"UI_LCD_PerchScreen_{m}"
        scr.scale = (0.9, 0.05, 0.5)
        scr.location = (mx, 0.25, 1.6)
        bpy.ops.object.transform_apply(location=True, scale=True)
        scr.data.materials.append(mat_screen)
        
    # 5. Ergonomic Carbon Swivel Bucket Seats (6 seats for engineers & Team Principal)
    for s in range(6):
        sx = -3.0 + s * 1.2
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        seat = bpy.context.active_object
        seat.name = f"Seat_Perch_{s}"
        seat.scale = (0.55, 0.55, 0.75)
        seat.location = (sx, 1.2, 1.35)
        bpy.ops.object.transform_apply(location=True, scale=True)
        seat.data.materials.append(mat_rbr_navy)

    export_active_to_fbx(os.path.join(OUTPUT_DIR, "PitWall_Command_Perch.fbx"))

# =========================================================================
# ASSET 5: 2026 Formula 1 "Nimble Car" Model with Inspection Subassemblies
# =========================================================================
def build_2026_f1_car():
    reset_scene()
    
    mat_rbr_navy = create_material("Mat_Car_Navy", [0.098, 0.137, 0.333], roughness=0.25, metallic=0.15)
    mat_rbr_red = create_material("Mat_Car_Red", [0.855, 0.145, 0.125], roughness=0.25)
    mat_rbr_yellow = create_material("Mat_Car_Yellow", [0.965, 0.722, 0.0], roughness=0.25)
    mat_carbon = create_material("Mat_Car_Carbon", [0.08, 0.08, 0.09], roughness=0.3, metallic=0.2)
    mat_ti_halo = create_material("Mat_Halo_Titanium", [0.45, 0.46, 0.48], roughness=0.35, metallic=0.9)
    mat_metal_internals = create_material("Mat_Engine_Metal", [0.75, 0.76, 0.78], roughness=0.25, metallic=0.95)
    mat_exhaust = create_material("Mat_Exhaust_Inconel", [0.65, 0.55, 0.45], roughness=0.4, metallic=0.85)
    mat_rubber = create_material("Mat_Tire_Pirelli", [0.12, 0.12, 0.13], roughness=0.8)
    mat_rim = create_material("Mat_Wheel_ForgedRim", [0.18, 0.19, 0.22], roughness=0.2, metallic=0.9)
    
    # 1. Monocoque Survival Cell
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    tub = bpy.context.active_object
    tub.name = "Body_Monocoque_SurvivalCell"
    tub.scale = (0.65, 2.2, 0.55)
    tub.location = (0, 0.2, 0.45)
    bpy.ops.object.transform_apply(location=True, scale=True)
    tub.data.materials.append(mat_rbr_navy)
    
    # 2. Front Wing Assembly (Nosecone + multi-element mainplane & endplates)
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    fw = bpy.context.active_object
    fw.name = "Front_Wing_Assembly"
    fw.scale = (1.8, 0.6, 0.12)
    fw.location = (0, 2.3, 0.16)
    bpy.ops.object.transform_apply(location=True, scale=True)
    fw.data.materials.append(mat_rbr_navy)
    
    # Nosecone
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=1.1)
    nose = bpy.context.active_object
    nose.name = "Nosecone_Tip"
    nose.rotation_euler = (math.radians(90), 0, 0)
    nose.location = (0, 1.8, 0.35)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    nose.data.materials.append(mat_rbr_navy)
    
    # 3. Engine Cover & Shark Fin Assembly
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    ec = bpy.context.active_object
    ec.name = "Engine_Cover_Assembly"
    ec.scale = (0.55, 1.7, 0.65)
    ec.location = (0, -1.0, 0.68)
    bpy.ops.object.transform_apply(location=True, scale=True)
    ec.data.materials.append(mat_rbr_navy)
    
    # Shark Fin
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    fin = bpy.context.active_object
    fin.name = "Shark_Fin_Dorsal"
    fin.scale = (0.04, 1.4, 0.35)
    fin.location = (0, -1.1, 0.95)
    bpy.ops.object.transform_apply(location=True, scale=True)
    fin.data.materials.append(mat_rbr_yellow)
    
    # Active Rear Wing
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    rw = bpy.context.active_object
    rw.name = "Rear_Wing_ActiveAero"
    rw.scale = (1.0, 0.45, 0.22)
    rw.location = (0, -2.1, 0.95)
    bpy.ops.object.transform_apply(location=True, scale=True)
    rw.data.materials.append(mat_carbon)
    
    # 4. Sidepods Assembly (LH & RH)
    for s, sx in [(-1, -0.65), (1, 0.65)]:
        sname = "LH" if s < 0 else "RH"
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        sp = bpy.context.active_object
        sp.name = f"Sidepods_Assembly_{sname}"
        sp.scale = (0.5, 1.8, 0.42)
        sp.location = (sx, -0.2, 0.35)
        bpy.ops.object.transform_apply(location=True, scale=True)
        sp.data.materials.append(mat_rbr_navy)
        
    # 5. Floor & Ground Effect Diffuser Assembly
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    floor = bpy.context.active_object
    floor.name = "Floor_Diffuser_Assembly"
    floor.scale = (1.65, 3.2, 0.06)
    floor.location = (0, -0.1, 0.08)
    bpy.ops.object.transform_apply(location=True, scale=True)
    floor.data.materials.append(mat_carbon)
    
    # 6. Titanium Halo Assembly
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.75)
    halo_v = bpy.context.active_object
    halo_v.name = "Halo_Assembly"
    halo_v.rotation_euler = (math.radians(20), 0, 0)
    halo_v.location = (0, 0.4, 0.72)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    halo_v.data.materials.append(mat_ti_halo)
    
    # Halo Hoop Ring
    bpy.ops.mesh.primitive_torus_add(major_radius=0.28, minor_radius=0.035)
    halo_h = bpy.context.active_object
    halo_h.name = "Halo_Hoop"
    halo_h.location = (0, 0.15, 0.85)
    bpy.ops.object.transform_apply(location=True)
    halo_h.data.materials.append(mat_ti_halo)
    
    # 7. Wheels & Tyres Assembly (4 wheels)
    wheel_positions = [
        ("Front_LH", -0.92, 1.7, 0.36, 0.28),
        ("Front_RH", 0.92, 1.7, 0.36, 0.28),
        ("Rear_LH", -0.95, -1.7, 0.36, 0.38),
        ("Rear_RH", 0.95, -1.7, 0.36, 0.38)
    ]
    for wname, wx, wy, wz, wwidth in wheel_positions:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.36, depth=wwidth)
        wh = bpy.context.active_object
        wh.name = f"Wheels_Assembly_{wname}"
        wh.rotation_euler = (0, math.radians(90), 0)
        wh.location = (wx, wy, wz)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        wh.data.materials.append(mat_rubber)
        
    # 8. V6 Power Unit Internals (Inside engine bay)
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    v6 = bpy.context.active_object
    v6.name = "V6_Engine_Internals"
    v6.scale = (0.42, 0.65, 0.45)
    v6.location = (0, -0.65, 0.4)
    bpy.ops.object.transform_apply(location=True, scale=True)
    v6.data.materials.append(mat_metal_internals)
    
    # Twin Exhaust Pipes
    for ex, sx in [(-0.1, "LH"), (0.1, "RH")]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.8)
        pipe = bpy.context.active_object
        pipe.name = f"Exhaust_Pipe_{sx}"
        pipe.rotation_euler = (math.radians(85), 0, 0)
        pipe.location = (ex, -1.6, 0.45)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        pipe.data.materials.append(mat_exhaust)
        
    # 9. 8-Speed Gearbox & Differential Internals
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    gb = bpy.context.active_object
    gb.name = "Gearbox_Internals"
    gb.scale = (0.32, 0.65, 0.35)
    gb.location = (0, -1.35, 0.32)
    bpy.ops.object.transform_apply(location=True, scale=True)
    gb.data.materials.append(mat_metal_internals)
    
    # 10. Front Pushrod & Wishbone Suspension Struts
    for s, sx in [(-1, -0.55), (1, 0.55)]:
        sname = "LH" if s < 0 else "RH"
        bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=0.85)
        rod = bpy.context.active_object
        rod.name = f"Suspension_Pushrods_{sname}"
        rod.rotation_euler = (math.radians(25), math.radians(s * 45), 0)
        rod.location = (sx, 1.4, 0.42)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        rod.data.materials.append(mat_carbon)

    export_active_to_fbx(os.path.join(OUTPUT_DIR, "Car_2026_F1.fbx"))

if __name__ == '__main__':
    print("=== Building 3D Garages & Pit Lane Assets ===")
    build_pit_building()
    build_hero_garage()
    build_pit_gantry()
    build_pit_wall_perch()
    build_2026_f1_car()
    print("=== All Assets Successfully Generated & Exported ===")

