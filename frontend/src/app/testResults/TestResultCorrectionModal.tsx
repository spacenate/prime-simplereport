import React, { useState } from "react";
import { gql, useMutation } from "@apollo/client";
import Modal from "react-modal";

import Button from "../commonComponents/Button/Button";
import { displayFullName, showNotification } from "../utils";
import "./TestResultCorrectionModal.scss";
import {
  InjectedQueryWrapperProps,
  QueryWrapper,
} from "../commonComponents/QueryWrapper";
import Alert from "../commonComponents/Alert";
import Dropdown from "../commonComponents/Dropdown";
import RadioGroup from "../commonComponents/RadioGroup";
import Required from "../commonComponents/Required";

export enum TestCorrectionReason {
  DUPLICATE_TEST = "DUPLICATE_TEST",
  INCORRECT_RESULT = "INCORRECT_RESULT",
  INCORRECT_TEST_DATE = "INCORRECT_TEST_DATE",
  OTHER = "OTHER",
}

export const TestCorrectionReasons = {
  [TestCorrectionReason.DUPLICATE_TEST]: "Duplicate test",
  [TestCorrectionReason.INCORRECT_RESULT]: "Incorrect test result",
  [TestCorrectionReason.INCORRECT_TEST_DATE]: "Incorrect test date",
  [TestCorrectionReason.OTHER]: "Reason not listed",
};

export enum TestCorrectionAction {
  MARK_AS_ERROR = "MARK_AS_ERROR",
  CORRECT_RESULT = "CORRECT_RESULT",
}
export const TestCorrectionActions = {
  [TestCorrectionAction.MARK_AS_ERROR]: "Mark result as an error",
  [TestCorrectionAction.CORRECT_RESULT]: "Correct result",
};

export const TestCorrectionActionsDescriptions = {
  [TestCorrectionAction.MARK_AS_ERROR]:
    "The test result will be marked as an error.",
  [TestCorrectionAction.CORRECT_RESULT]:
    "Make a correction to the test result and submit.",
};

export const testCorrectionReasonValues: {
  value: TestCorrectionReason;
  label: string;
}[] = Object.entries(TestCorrectionReasons).map(([k, v]: [string, string]) => ({
  value: k as TestCorrectionReason,
  label: v,
}));

const testCorrectionActionValues = Object.entries(TestCorrectionActions).map(
  ([k, v]: [string, string]) => ({
    label: (
      <>
        {v}
        <span className="usa-checkbox__label-description">
          <p>{TestCorrectionActionsDescriptions[k as TestCorrectionAction]}</p>
        </span>
      </>
    ),
    value: k,
  })
);

export const testQuery = gql`
  query getTestResultForCorrection($id: ID!) {
    testResult(id: $id) {
      dateTested
      result
      correctionStatus
      deviceType {
        name
      }
      patient {
        firstName
        middleName
        lastName
        birthDate
      }
    }
  }
`;

const MARK_TEST_AS_ERROR = gql`
  mutation MarkTestAsError($id: ID!, $reason: String!) {
    correctTestMarkAsError(id: $id, reason: $reason) {
      internalId
    }
  }
`;

const MARK_TEST_AS_CORRECTION = gql`
  mutation MarkTestAsCorrection($id: ID!, $reason: String!) {
    correctTestMarkAsCorrection(id: $id, reason: $reason) {
      internalId
    }
  }
`;

interface Props {
  data: any; // testQuery result
  testResultId: string | undefined;
  closeModal: () => void;
}

export const DetachedTestResultCorrectionModal = ({
  testResultId,
  data,
  closeModal,
}: Props) => {
  const [markTestAsError] = useMutation(MARK_TEST_AS_ERROR);
  const [markTestAsCorrection] = useMutation(MARK_TEST_AS_CORRECTION);
  const { patient } = data.testResult;
  // TODO: don't hardcode this
  const [reason, setReason] = useState<TestCorrectionReason>(
    testCorrectionReasonValues[0].value
  );
  const [action, setAction] = useState<TestCorrectionAction>();
  const [correctionDetails, setCorrectionDetails] = useState("");

  const markAsError = () => {
    markTestAsError({
      variables: {
        id: testResultId,
        reason,
      },
    })
      .then(() => {
        const alert = (
          <Alert type="success" title="Result marked as error" body="" />
        );
        showNotification(alert);
      })
      .finally(() => {
        closeModal();
      });
  };

  const markAsCorrection = () => {
    markTestAsCorrection({
      variables: {
        id: testResultId,
        reason,
      },
    })
      .then(() => {
        const alert = (
          // TODO: better text here, maybe indicating to user that the test should now
          // be available in the queue
          <Alert type="success" title="Result marked as correction" body="" />
        );
        showNotification(alert);
      })
      .finally(() => {
        closeModal();
      });
  };

  return (
    <Modal
      isOpen={true}
      className="sr-test-correction-modal-content"
      overlayClassName="sr-test-correction-modal-overlay"
      contentLabel="Correct result"
    >
      <h3 className="modal__heading">
        Correct result for{" "}
        {displayFullName(patient.firstName, null, patient.lastName, true)}
      </h3>

      <Dropdown
        options={testCorrectionReasonValues}
        label="Please select a reason for correcting this test result."
        name="correctionReason"
        onChange={(e) => setReason(e.target.value as TestCorrectionReason)}
        selectedValue={reason || testCorrectionReasonValues[0].value}
      />
      {reason === TestCorrectionReason.OTHER && (
        <>
          <p>
            Additional information: <Required />
          </p>
          <p>
            <textarea
              className="sr-test-correction-reason"
              name="correctionReason"
              onChange={(e) => setCorrectionDetails(e.target.value)}
            ></textarea>
          </p>
          <RadioGroup
            legend={
              <>
                <strong>Select an action:</strong> <Required />
              </>
            }
            buttons={testCorrectionActionValues}
            selectedRadio={action}
            onChange={(e) => {
              setAction(e as TestCorrectionAction);
            }}
          />
        </>
      )}
      <br />
      <div className="sr-test-correction-buttons">
        <Button variant="unstyled" label="No, go back" onClick={closeModal} />
        <Button
          label="Yes, I'm sure"
          disabled={
            reason === TestCorrectionReason.OTHER &&
            (!action || correctionDetails.trim().length < 4)
          }
          onClick={() => {
            return reason === TestCorrectionReason.DUPLICATE_TEST ||
              (reason === TestCorrectionReason.OTHER &&
                action &&
                action === TestCorrectionAction.MARK_AS_ERROR)
              ? markAsError()
              : markAsCorrection();
          }}
        />
      </div>
    </Modal>
  );
};

const TestResultCorrectionModal = (
  props: Omit<Props, InjectedQueryWrapperProps>
) => (
  <QueryWrapper<Props>
    query={testQuery}
    queryOptions={{ variables: { id: props.testResultId } }}
    Component={DetachedTestResultCorrectionModal}
    componentProps={{ ...props }}
  />
);

export default TestResultCorrectionModal;
