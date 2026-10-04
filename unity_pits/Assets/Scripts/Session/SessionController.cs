using UnityEngine;
using System;

namespace F1Nimble.Session
{
    public enum SessionPhase
    {
        QualifyingWait,
        Practice,
        PreRacePrep,
        InRacePitStop,
        WorkshopInspection
    }

    /// <summary>
    /// Unified Session Controller for the 2026 F1 Garages & Pit Lane.
    /// Manages weekend phase transitions, audio atmosphere, and lighting states.
    /// </summary>
    public class SessionController : MonoBehaviour
    {
        public static SessionController Instance { get; private set; }

        [Header("Current State")]
        [SerializeField] private SessionPhase currentPhase = SessionPhase.QualifyingWait;
        public SessionPhase CurrentPhase => currentPhase;

        [Header("Scene Actors & Targets")]
        [SerializeField] private GameObject carRoot;
        [SerializeField] private Transform garageStandsAnchor;
        [SerializeField] private Transform pitBoxStopAnchor;
        [SerializeField] private Transform pitExitAnchor;

        [Header("Gantry & Release Lights")]
        [SerializeField] private GameObject releaseLightRed;
        [SerializeField] private GameObject releaseLightGreen;

        [Header("Tire Blankets & Equipment")]
        [SerializeField] private GameObject tireBlankets;
        [SerializeField] private GameObject coolingBlowers;
        [SerializeField] private GameObject telemetryScreens;

        [Header("Audio")]
        [SerializeField] private AudioSource ambientAudioSource;
        [SerializeField] private AudioSource iceEngineSource;
        [SerializeField] private AudioSource airGunsSource;

        public event Action<SessionPhase> OnSessionPhaseChanged;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        private void Start()
        {
            SetSessionPhase(SessionPhase.QualifyingWait);
        }

        public void SetSessionPhase(SessionPhase newPhase)
        {
            currentPhase = newPhase;
            ApplyPhaseState(currentPhase);
            OnSessionPhaseChanged?.Invoke(currentPhase);
        }

        private void ApplyPhaseState(SessionPhase phase)
        {
            switch (phase)
            {
                case SessionPhase.QualifyingWait:
                    ConfigureQualifyingWait();
                    break;
                case SessionPhase.Practice:
                    ConfigurePractice();
                    break;
                case SessionPhase.PreRacePrep:
                    ConfigurePreRacePrep();
                    break;
                case SessionPhase.InRacePitStop:
                    ConfigurePitStop();
                    break;
                case SessionPhase.WorkshopInspection:
                    ConfigureWorkshopInspection();
                    break;
            }
        }

        private void ConfigureQualifyingWait()
        {
            // Car on stands inside garage with heating blankets and blowers
            if (carRoot && garageStandsAnchor)
            {
                carRoot.transform.position = garageStandsAnchor.position;
                carRoot.transform.rotation = garageStandsAnchor.rotation;
            }
            if (tireBlankets) tireBlankets.SetActive(true);
            if (coolingBlowers) coolingBlowers.SetActive(true);
            SetReleaseLight(isGreen: false);
        }

        private void ConfigurePractice()
        {
            if (tireBlankets) tireBlankets.SetActive(false);
            if (coolingBlowers) coolingBlowers.SetActive(false);
            SetReleaseLight(isGreen: true);
        }

        private void ConfigurePreRacePrep()
        {
            if (tireBlankets) tireBlankets.SetActive(true);
            if (coolingBlowers) coolingBlowers.SetActive(true);
            SetReleaseLight(isGreen: false);
        }

        private void ConfigurePitStop()
        {
            if (carRoot && pitBoxStopAnchor)
            {
                carRoot.transform.position = pitBoxStopAnchor.position;
                carRoot.transform.rotation = pitBoxStopAnchor.rotation;
            }
            if (tireBlankets) tireBlankets.SetActive(false);
            if (coolingBlowers) coolingBlowers.SetActive(false);
            SetReleaseLight(isGreen: false);
        }

        private void ConfigureWorkshopInspection()
        {
            if (carRoot && garageStandsAnchor)
            {
                carRoot.transform.position = garageStandsAnchor.position;
                carRoot.transform.rotation = garageStandsAnchor.rotation;
            }
            if (tireBlankets) tireBlankets.SetActive(false);
            if (coolingBlowers) coolingBlowers.SetActive(false);
            SetReleaseLight(isGreen: false);
        }

        public void SetReleaseLight(bool isGreen)
        {
            if (releaseLightRed) releaseLightRed.SetActive(!isGreen);
            if (releaseLightGreen) releaseLightGreen.SetActive(isGreen);
        }

        // GUI for real-time phase switching
        private void OnGUI()
        {
            GUILayout.BeginArea(new Rect(20, 20, 260, 260), "F1 Session Controller", GUI.skin.window);
            
            GUILayout.Label($"Active: <b>{currentPhase}</b>");
            GUILayout.Space(6);

            if (GUILayout.Button("1. Qualifying Wait")) SetSessionPhase(SessionPhase.QualifyingWait);
            if (GUILayout.Button("2. Practice Session")) SetSessionPhase(SessionPhase.Practice);
            if (GUILayout.Button("3. Pre-Race Prep")) SetSessionPhase(SessionPhase.PreRacePrep);
            if (GUILayout.Button("4. In-Race Pit Stop")) SetSessionPhase(SessionPhase.InRacePitStop);
            if (GUILayout.Button("5. Workshop Inspection")) SetSessionPhase(SessionPhase.WorkshopInspection);

            GUILayout.EndArea();
        }
    }
}
