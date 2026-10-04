#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using UnityEditor.SceneManagement;
using UnityEngine.Rendering;
using F1Nimble.Session;
using F1Nimble.CameraSystem;
using F1Nimble.Inspection;

namespace F1Nimble.Editor
{
    public static class PitLaneSceneBuilder
    {
        [MenuItem("F1 Nimble Car/Build Red Bull Ring Pits & Garages Scene", false, 10)]
        public static void BuildMasterScene()
        {
            // 1. Create a new clean scene
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            
            // 2. Load Model Assets from Assets/Models/
            var pitBuildingPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Models/PitBuilding_32Bays.fbx");
            var heroGaragePrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Models/Hero_RedBull_Garage.fbx");
            var gantryBoomPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Models/PitLane_Gantry_Boom.fbx");
            var pitWallPerchPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Models/PitWall_Command_Perch.fbx");
            var carPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Models/Car_2026_F1.fbx");

            // Root groups
            var envRoot = new GameObject("=== ENVIRONMENT & LIGHTING ===");
            var trackRoot = new GameObject("=== PIT COMPLEX & BUILDINGS ===");
            var carRoot = new GameObject("=== 2026 F1 NIMBLE CAR ===");
            var cameraRoot = new GameObject("=== CAMERAS & ANCHORS ===");
            var systemRoot = new GameObject("=== SESSION SYSTEM ===");

            // 3. Directional Sun Light
            var sunObj = new GameObject("Sun_Directional_Light");
            sunObj.transform.SetParent(envRoot.transform);
            var sunLight = sunObj.AddComponent<Light>();
            sunLight.type = LightType.Directional;
            sunLight.intensity = 100000f; // Physical lux
            sunLight.color = new Color(1.0f, 0.98f, 0.94f);
            sunObj.transform.rotation = Quaternion.Euler(58f, -42f, 0f);

            // 4. Instantiate Pit Building
            GameObject pitBuildingInstance = null;
            if (pitBuildingPrefab != null)
            {
                pitBuildingInstance = (GameObject)PrefabUtility.InstantiatePrefab(pitBuildingPrefab);
                pitBuildingInstance.name = "PitBuilding_32Bays";
                pitBuildingInstance.transform.SetParent(trackRoot.transform);
                pitBuildingInstance.transform.position = Vector3.zero;
            }

            // Red Bull Racing is Bay #6 in the 2026 order (FIA:3, FOM:1, Walkway:1, McLaren:3, Merc:3, Walkway, RBR:3)
            // Bay index ~10. Center of Bay 10 along X:
            float bayWidth = 305.3f / 32.0f; // ~9.54m
            float rbrBayX = -305.3f / 2.0f + (10.5f) * bayWidth;

            // 5. Instantiate Hero Red Bull Garage Interior
            GameObject heroGarageInstance = null;
            if (heroGaragePrefab != null)
            {
                heroGarageInstance = (GameObject)PrefabUtility.InstantiatePrefab(heroGaragePrefab);
                heroGarageInstance.name = "Hero_RedBull_Garage";
                heroGarageInstance.transform.SetParent(trackRoot.transform);
                heroGarageInstance.transform.position = new Vector3(rbrBayX, 0f, 0f);
            }

            // 6. Instantiate Pit Lane Gantry Boom
            GameObject gantryInstance = null;
            if (gantryBoomPrefab != null)
            {
                gantryInstance = (GameObject)PrefabUtility.InstantiatePrefab(gantryBoomPrefab);
                gantryInstance.name = "PitLane_Gantry_Boom";
                gantryInstance.transform.SetParent(trackRoot.transform);
                gantryInstance.transform.position = new Vector3(rbrBayX, 0f, 0f);
            }

            // 7. Instantiate Pit Wall Command Perch
            GameObject perchInstance = null;
            if (pitWallPerchPrefab != null)
            {
                perchInstance = (GameObject)PrefabUtility.InstantiatePrefab(pitWallPerchPrefab);
                perchInstance.name = "PitWall_Command_Perch";
                perchInstance.transform.SetParent(trackRoot.transform);
                perchInstance.transform.position = new Vector3(rbrBayX, 0f, -14.0f); // Trackside pit wall barrier
                perchInstance.transform.rotation = Quaternion.Euler(0f, 180f, 0f);
            }

            // 8. Instantiate 2026 F1 Car
            GameObject carInstance = null;
            if (carPrefab != null)
            {
                carInstance = (GameObject)PrefabUtility.InstantiatePrefab(carPrefab);
                carInstance.name = "Car_2026_F1";
                carInstance.transform.SetParent(carRoot.transform);
                carInstance.transform.position = new Vector3(rbrBayX, 0.45f, 7.0f); // Inside Red Bull garage on stands
                carInstance.transform.rotation = Quaternion.Euler(0f, 180f, 0f);

                // Add Inspection Controller
                var inspectCtrl = carInstance.AddComponent<CarInspectionController>();
                // Wire children components via reflection/names
                var fw = carInstance.transform.Find("Front_Wing_Assembly");
                var ec = carInstance.transform.Find("Engine_Cover_Assembly");
                var fl = carInstance.transform.Find("Floor_Diffuser_Assembly");
                var hl = carInstance.transform.Find("Halo_Assembly");
                
                var so = new SerializedObject(inspectCtrl);
                if (fw) so.FindProperty("frontWingAssembly").objectReferenceValue = fw.gameObject;
                if (ec) so.FindProperty("engineCoverAssembly").objectReferenceValue = ec.gameObject;
                if (fl) so.FindProperty("floorDiffuserAssembly").objectReferenceValue = fl.gameObject;
                if (hl) so.FindProperty("haloAssembly").objectReferenceValue = hl.gameObject;
                so.ApplyModifiedProperties();
            }

            // 9. Camera Presets & Anchors
            var perchAnchor = new GameObject("Anchor_PitPerch");
            perchAnchor.transform.SetParent(cameraRoot.transform);
            perchAnchor.transform.position = new Vector3(rbrBayX, 2.2f, -12.5f);
            perchAnchor.transform.rotation = Quaternion.Euler(12f, 0f, 0f);

            var cockpitAnchor = new GameObject("Anchor_GarageCockpit");
            cockpitAnchor.transform.SetParent(cameraRoot.transform);
            cockpitAnchor.transform.position = new Vector3(rbrBayX, 1.4f, 6.2f);
            cockpitAnchor.transform.rotation = Quaternion.Euler(8f, 0f, 0f);

            var gantryAnchor = new GameObject("Anchor_OverheadGantry");
            gantryAnchor.transform.SetParent(cameraRoot.transform);
            gantryAnchor.transform.position = new Vector3(rbrBayX, 5.5f, -2.5f);
            gantryAnchor.transform.rotation = Quaternion.Euler(45f, 0f, 0f);

            var exitAnchor = new GameObject("Anchor_PitExit");
            exitAnchor.transform.SetParent(cameraRoot.transform);
            exitAnchor.transform.position = new Vector3(rbrBayX + 60f, 2.0f, -8f);
            exitAnchor.transform.rotation = Quaternion.Euler(8f, -120f, 0f);

            // Main Camera
            var camObj = new GameObject("Main Camera");
            camObj.transform.SetParent(cameraRoot.transform);
            var cam = camObj.AddComponent<Camera>();
            camObj.tag = "MainCamera";
            camObj.AddComponent<AudioListener>();
            var camCtrl = camObj.AddComponent<CinematicCameraController>();

            var camSo = new SerializedObject(camCtrl);
            camSo.FindProperty("pitPerchPoint").objectReferenceValue = perchAnchor.transform;
            camSo.FindProperty("garageCockpitPoint").objectReferenceValue = cockpitAnchor.transform;
            camSo.FindProperty("overheadGantryPoint").objectReferenceValue = gantryAnchor.transform;
            camSo.FindProperty("pitExitPoint").objectReferenceValue = exitAnchor.transform;
            if (carInstance) camSo.FindProperty("carTarget").objectReferenceValue = carInstance.transform;
            camSo.ApplyModifiedProperties();

            // 10. Session Controller
            var sessionObj = new GameObject("SessionController");
            sessionObj.transform.SetParent(systemRoot.transform);
            var sessionCtrl = sessionObj.AddComponent<SessionController>();

            var sessSo = new SerializedObject(sessionCtrl);
            if (carInstance) sessSo.FindProperty("carRoot").objectReferenceValue = carInstance;
            sessSo.FindProperty("garageStandsAnchor").objectReferenceValue = cockpitAnchor.transform;
            sessSo.FindProperty("pitBoxStopAnchor").objectReferenceValue = gantryAnchor.transform;
            sessSo.FindProperty("pitExitAnchor").objectReferenceValue = exitAnchor.transform;
            sessSo.ApplyModifiedProperties();

            // Save Scene
            string scenePath = "Assets/Scenes/RedBullRing_Garages_PitLane.unity";
            EditorSceneManager.SaveScene(scene, scenePath);
            Debug.Log($"Successfully built master F1 Pits & Garages scene at: {scenePath}");
        }
    }
}
#endif
