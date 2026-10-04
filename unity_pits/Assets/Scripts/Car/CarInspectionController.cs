using UnityEngine;

namespace F1Nimble.Inspection
{
    /// <summary>
    /// Interactive Car Inspection Controller for the Workshop mode.
    /// Allows toggling bodywork assemblies to inspect 2026 internal mechanics.
    /// </summary>
    public class CarInspectionController : MonoBehaviour
    {
        [Header("Togglable Bodywork Assemblies")]
        [SerializeField] private GameObject frontWingAssembly;
        [SerializeField] private GameObject engineCoverAssembly;
        [SerializeField] private GameObject sidepodsAssembly;
        [SerializeField] private GameObject floorDiffuserAssembly;
        [SerializeField] private GameObject wheelsAssembly;
        [SerializeField] private GameObject haloAssembly;

        [Header("Internals Exposed")]
        [SerializeField] private GameObject v6EngineInternals;
        [SerializeField] private GameObject gearboxInternals;
        [SerializeField] private GameObject suspensionPushrods;

        [Header("Exploded View")]
        [Range(0f, 1f)]
        [SerializeField] private float explodedProgress = 0f;

        public void ToggleFrontWing()
        {
            if (frontWingAssembly) frontWingAssembly.SetActive(!frontWingAssembly.activeSelf);
        }

        public void ToggleEngineCover()
        {
            if (engineCoverAssembly) engineCoverAssembly.SetActive(!engineCoverAssembly.activeSelf);
        }

        public void ToggleSidepods()
        {
            if (sidepodsAssembly) sidepodsAssembly.SetActive(!sidepodsAssembly.activeSelf);
        }

        public void ToggleFloor()
        {
            if (floorDiffuserAssembly) floorDiffuserAssembly.SetActive(!floorDiffuserAssembly.activeSelf);
        }

        public void ToggleWheels()
        {
            if (wheelsAssembly) wheelsAssembly.SetActive(!wheelsAssembly.activeSelf);
        }

        public void ToggleHalo()
        {
            if (haloAssembly) haloAssembly.SetActive(!haloAssembly.activeSelf);
        }

        public void SetAllBodywork(bool active)
        {
            if (frontWingAssembly) frontWingAssembly.SetActive(active);
            if (engineCoverAssembly) engineCoverAssembly.SetActive(active);
            if (sidepodsAssembly) sidepodsAssembly.SetActive(active);
            if (floorDiffuserAssembly) floorDiffuserAssembly.SetActive(active);
            if (wheelsAssembly) wheelsAssembly.SetActive(active);
            if (haloAssembly) haloAssembly.SetActive(active);
        }

        private void OnGUI()
        {
            // Only draw GUI in Workshop Inspection Mode
            if (Session.SessionController.Instance != null &&
                Session.SessionController.Instance.CurrentPhase != Session.SessionPhase.WorkshopInspection)
            {
                return;
            }

            GUILayout.BeginArea(new Rect(20, Screen.height - 230, 260, 210), "Workshop Panel Toggles", GUI.skin.window);
            
            if (GUILayout.Button(frontWingAssembly != null && frontWingAssembly.activeSelf ? "Hide Front Wing" : "Show Front Wing"))
                ToggleFrontWing();

            if (GUILayout.Button(engineCoverAssembly != null && engineCoverAssembly.activeSelf ? "Hide Engine Cover" : "Show Engine Cover"))
                ToggleEngineCover();

            if (GUILayout.Button(sidepodsAssembly != null && sidepodsAssembly.activeSelf ? "Hide Sidepod Skins" : "Show Sidepod Skins"))
                ToggleSidepods();

            if (GUILayout.Button(wheelsAssembly != null && wheelsAssembly.activeSelf ? "Hide Wheels (Brakes View)" : "Show Wheels"))
                ToggleWheels();

            if (GUILayout.Button("Strip All Outer Bodywork"))
                SetAllBodywork(false);

            if (GUILayout.Button("Restore All Bodywork"))
                SetAllBodywork(true);

            GUILayout.EndArea();
        }
    }
}
