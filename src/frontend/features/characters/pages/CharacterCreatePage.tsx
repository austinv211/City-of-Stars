import { useReducer } from "react";
import { useNavigate } from "react-router";
import { WizardShell } from "../components/wizard/WizardShell";
import { Step1_Identity } from "../components/wizard/Step1_Identity";
import { Step2_Background } from "../components/wizard/Step2_Background";
import { Step3_AbilityScores } from "../components/wizard/Step3_AbilityScores";
import { Step4_Proficiencies } from "../components/wizard/Step4_Proficiencies";
import { Step5_Portrait } from "../components/wizard/Step5_Portrait";
import { Step6_Review } from "../components/wizard/Step6_Review";
import { useCharacterMutation } from "../hooks/useCharacterMutation";
import { wizardReducer, INITIAL_WIZARD_STATE } from "../types/character.types";
import type { WizardState } from "../types/character.types";

export default function CharacterCreatePage() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_WIZARD_STATE);
  const { commitCharacter, loading, error } = useCharacterMutation();

  function advance() {
    if (state.step < 6) {
      dispatch({ type: "SET_STEP", step: (state.step + 1) as WizardState["step"] });
    }
  }

  async function handleCommit() {
    try {
      const id = await commitCharacter(state);
      navigate(`/characters/${id}`);
    } catch {
      // error is already set in the hook
    }
  }

  return (
    <WizardShell state={state} dispatch={dispatch}>
      {state.step === 1 && (
        <Step1_Identity state={state} dispatch={dispatch} onNext={advance} />
      )}
      {state.step === 2 && (
        <Step2_Background state={state} dispatch={dispatch} onNext={advance} />
      )}
      {state.step === 3 && (
        <Step3_AbilityScores state={state} dispatch={dispatch} onNext={advance} />
      )}
      {state.step === 4 && (
        <Step4_Proficiencies state={state} dispatch={dispatch} onNext={advance} />
      )}
      {state.step === 5 && (
        <Step5_Portrait state={state} dispatch={dispatch} onNext={advance} />
      )}
      {state.step === 6 && (
        <Step6_Review state={state} onCommit={handleCommit} loading={loading} error={error} />
      )}
    </WizardShell>
  );
}
