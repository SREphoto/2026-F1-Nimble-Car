using UnityEngine;

namespace F1Nimble.CameraSystem
{
    public enum CameraPreset
    {
        FreeCam,
        PitPerch,
        GarageCockpit,
        OverheadGantry,
        PitExit,
        CarOrbit
    }

    /// <summary>
    /// Cinematic and Free-Cam Controller for the Garages and Pit Lane.
    /// Supports preset cycling, free-flight navigation, and smooth damping.
    /// </summary>
    public class CinematicCameraController : MonoBehaviour
    {
        [Header("Current Mode")]
        [SerializeField] private CameraPreset activePreset = CameraPreset.PitPerch;

        [Header("Presets Transforms")]
        [SerializeField] private Transform pitPerchPoint;
        [SerializeField] private Transform garageCockpitPoint;
        [SerializeField] private Transform overheadGantryPoint;
        [SerializeField] private Transform pitExitPoint;
        [SerializeField] private Transform carTarget;

        [Header("Free Cam Settings")]
        [SerializeField] private float moveSpeed = 12f;
        [SerializeField] private float fastMoveMultiplier = 2.5f;
        [SerializeField] private float lookSensitivity = 2.5f;
        [SerializeField] private float smoothTime = 0.15f;

        private float yaw;
        private float pitch;
        private Vector3 currentVelocity;

        private void Start()
        {
            Vector3 angles = transform.eulerAngles;
            yaw = angles.y;
            pitch = angles.x;
            ApplyPreset(activePreset, instant: true);
        }

        private void Update()
        {
            HandlePresetShortcuts();

            if (activePreset == CameraPreset.FreeCam)
            {
                HandleFreeCam();
            }
            else
            {
                FollowCurrentPreset();
            }
        }

        private void HandlePresetShortcuts()
        {
            if (Input.GetKeyDown(KeyCode.Alpha1)) ApplyPreset(CameraPreset.PitPerch);
            if (Input.GetKeyDown(KeyCode.Alpha2)) ApplyPreset(CameraPreset.GarageCockpit);
            if (Input.GetKeyDown(KeyCode.Alpha3)) ApplyPreset(CameraPreset.OverheadGantry);
            if (Input.GetKeyDown(KeyCode.Alpha4)) ApplyPreset(CameraPreset.PitExit);
            if (Input.GetKeyDown(KeyCode.Alpha5)) ApplyPreset(CameraPreset.CarOrbit);
            if (Input.GetKeyDown(KeyCode.Tab)) ApplyPreset(CameraPreset.FreeCam);
        }

        public void ApplyPreset(CameraPreset preset, bool instant = false)
        {
            activePreset = preset;
            Transform targetPoint = GetPresetTransform(preset);

            if (targetPoint != null)
            {
                if (instant)
                {
                    transform.position = targetPoint.position;
                    transform.rotation = targetPoint.rotation;
                }
                Vector3 angles = targetPoint.eulerAngles;
                yaw = angles.y;
                pitch = angles.x;
            }
        }

        private Transform GetPresetTransform(CameraPreset preset)
        {
            switch (preset)
            {
                case CameraPreset.PitPerch: return pitPerchPoint;
                case CameraPreset.GarageCockpit: return garageCockpitPoint;
                case CameraPreset.OverheadGantry: return overheadGantryPoint;
                case CameraPreset.PitExit: return pitExitPoint;
                default: return null;
            }
        }

        private void FollowCurrentPreset()
        {
            Transform target = GetPresetTransform(activePreset);
            if (target != null)
            {
                transform.position = Vector3.SmoothDamp(transform.position, target.position, ref currentVelocity, smoothTime);
                transform.rotation = Quaternion.Slerp(transform.rotation, target.rotation, Time.deltaTime * 6f);
            }
            else if (activePreset == CameraPreset.CarOrbit && carTarget != null)
            {
                transform.LookAt(carTarget.position + Vector3.up * 0.8f);
            }
        }

        private void HandleFreeCam()
        {
            if (Input.GetMouseButton(1)) // Right mouse button to look
            {
                yaw += Input.GetAxis("Mouse X") * lookSensitivity;
                pitch -= Input.GetAxis("Mouse Y") * lookSensitivity;
                pitch = Mathf.Clamp(pitch, -85f, 85f);
                transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
            }

            float speed = moveSpeed * (Input.GetKey(KeyCode.LeftShift) ? fastMoveMultiplier : 1f);
            Vector3 input = new Vector3(
                Input.GetAxisRaw("Horizontal"),
                (Input.GetKey(KeyCode.E) ? 1f : 0f) - (Input.GetKey(KeyCode.Q) ? 1f : 0f),
                Input.GetAxisRaw("Vertical")
            ).normalized;

            Vector3 move = transform.TransformDirection(input) * (speed * Time.deltaTime);
            transform.position += move;
        }

        private void OnGUI()
        {
            GUILayout.BeginArea(new Rect(Screen.width - 240, 20, 220, 210), "Camera Presets", GUI.skin.window);
            if (GUILayout.Button("[1] Pit Perch")) ApplyPreset(CameraPreset.PitPerch);
            if (GUILayout.Button("[2] Garage Cockpit")) ApplyPreset(CameraPreset.GarageCockpit);
            if (GUILayout.Button("[3] Overhead Gantry")) ApplyPreset(CameraPreset.OverheadGantry);
            if (GUILayout.Button("[4] Pit Exit")) ApplyPreset(CameraPreset.PitExit);
            if (GUILayout.Button("[5] Orbit Car")) ApplyPreset(CameraPreset.CarOrbit);
            if (GUILayout.Button("[Tab] Free-Cam")) ApplyPreset(CameraPreset.FreeCam);
            GUILayout.EndArea();
        }
    }
}
