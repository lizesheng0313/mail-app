#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use thiserror::Error;

pub const PROTOCOL_VERSION: &str = "fmm-automation/1";

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct AutomationEnvelope {
    pub protocol: String,
    pub browser_instance_id: String,
    pub recording_session_id: String,
    pub request_id: String,
    pub client_sequence: u64,
    pub global_sequence: u64,
    pub tab_id: u64,
    pub frame_id: u64,
    pub state_version: u64,
    pub occurred_at: String,
    #[serde(flatten)]
    pub message: AutomationMessage,
}

#[derive(Debug, Deserialize)]
struct RawAutomationEnvelope {
    protocol: String,
    browser_instance_id: String,
    recording_session_id: String,
    #[serde(default)]
    request_id: String,
    #[serde(default)]
    client_sequence: u64,
    #[serde(default)]
    global_sequence: u64,
    #[serde(default)]
    tab_id: u64,
    #[serde(default)]
    frame_id: u64,
    #[serde(default)]
    state_version: u64,
    #[serde(default)]
    occurred_at: String,
    #[serde(flatten)]
    message: AutomationMessage,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum AutomationMessage {
    #[serde(rename = "recording.event")]
    RecordingEvent(Map<String, Value>),
    #[serde(rename = "recording.state")]
    RecordingState(RecordingStateSnapshot),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RecordingStateSnapshot {
    pub recording: bool,
    pub finished: bool,
    pub phase: String,
    pub message: String,
    pub event_count: u64,
    pub mode: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Error)]
#[error("桌面自动化协议版本不兼容: {0}")]
pub struct ProtocolVersionError(String);

pub fn validate_protocol_version(protocol: &str) -> Result<(), ProtocolVersionError> {
    if protocol == PROTOCOL_VERSION {
        Ok(())
    } else {
        Err(ProtocolVersionError(protocol.to_owned()))
    }
}

#[derive(Debug, Error)]
pub enum ProtocolParseError {
    #[error("桌面自动化协议字段必须是字符串")]
    InvalidProtocolField,
    #[error(transparent)]
    IncompatibleProtocol(#[from] ProtocolVersionError),
    #[error("桌面自动化消息解析失败: {0}")]
    InvalidMessage(#[from] serde_json::Error),
    #[error("{0} 必须是非空字符串")]
    InvalidIdentity(&'static str),
}

pub fn parse_desktop_message(value: Value) -> Result<AutomationEnvelope, ProtocolParseError> {
    let protocol = value
        .get("protocol")
        .and_then(Value::as_str)
        .ok_or(ProtocolParseError::InvalidProtocolField)?;
    validate_protocol_version(protocol)?;

    let raw: RawAutomationEnvelope = serde_json::from_value(value)?;
    if raw.browser_instance_id.trim().is_empty() {
        return Err(ProtocolParseError::InvalidIdentity("browser_instance_id"));
    }
    if raw.recording_session_id.trim().is_empty() {
        return Err(ProtocolParseError::InvalidIdentity("recording_session_id"));
    }

    Ok(AutomationEnvelope {
        protocol: raw.protocol,
        browser_instance_id: raw.browser_instance_id,
        recording_session_id: raw.recording_session_id,
        request_id: raw.request_id,
        client_sequence: raw.client_sequence,
        global_sequence: raw.global_sequence,
        tab_id: raw.tab_id,
        frame_id: raw.frame_id,
        state_version: raw.state_version,
        occurred_at: raw.occurred_at,
        message: raw.message,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixtures() -> serde_json::Value {
        serde_json::from_str(include_str!(
            "../../../../../browser_workflow_plugin/protocol/fmm-automation-v1.json"
        ))
        .unwrap()
    }

    #[test]
    fn parses_canonical_event_fixture() {
        let event = parse_desktop_message(fixtures()["valid_event"].clone()).unwrap();

        assert_eq!(event.protocol, PROTOCOL_VERSION);
        assert_eq!(event.global_sequence, 9);
        match event.message {
            AutomationMessage::RecordingEvent(payload) => {
                assert_eq!(payload["kind"], "dom.click");
                assert_eq!(payload["selector"], "#submit");
            }
            other => panic!("expected recording event, got {other:?}"),
        }
    }

    #[test]
    fn parses_canonical_recording_state_fixture() {
        let state = parse_desktop_message(fixtures()["valid_state"].clone()).unwrap();

        assert_eq!(state.state_version, 7);
        match state.message {
            AutomationMessage::RecordingState(snapshot) => {
                assert!(!snapshot.recording);
                assert!(snapshot.finished);
                assert_eq!(snapshot.phase, "analyzing");
                assert_eq!(snapshot.event_count, 3);
            }
            other => panic!("expected recording state, got {other:?}"),
        }
    }

    #[test]
    fn real_parser_rejects_complete_incompatible_protocol_message() {
        let mut event = fixtures()["valid_event"].clone();
        event["protocol"] = serde_json::json!("fmm-automation/0");

        let error = parse_desktop_message(event).unwrap_err();

        assert!(error.to_string().contains("协议版本"));
    }

    #[test]
    fn rejects_unknown_message_type() {
        let mut event = fixtures()["valid_event"].clone();
        event["type"] = serde_json::json!("recording.unknown");

        assert!(parse_desktop_message(event).is_err());
    }

    #[test]
    fn recording_event_requires_an_object_payload() {
        for invalid_payload in [
            serde_json::Value::Null,
            serde_json::json!("not-an-object"),
            serde_json::json!([1, 2]),
        ] {
            let mut event = fixtures()["valid_event"].clone();
            event["payload"] = invalid_payload;
            assert!(parse_desktop_message(event).is_err());
        }
    }

    #[test]
    fn recording_state_rejects_missing_or_wrong_field_types() {
        let mut missing = fixtures()["valid_state"].clone();
        missing["payload"]
            .as_object_mut()
            .unwrap()
            .remove("recording");
        assert!(parse_desktop_message(missing).is_err());

        for (field, invalid_value) in [
            ("recording", serde_json::json!(1)),
            ("finished", serde_json::json!("true")),
            ("phase", serde_json::json!(1)),
            ("message", serde_json::json!(false)),
            ("mode", serde_json::json!([])),
        ] {
            let mut state = fixtures()["valid_state"].clone();
            state["payload"][field] = invalid_value;
            assert!(
                parse_desktop_message(state).is_err(),
                "accepted invalid recording.state field {field}"
            );
        }
    }

    fn invalid_u64_values() -> Vec<serde_json::Value> {
        vec![
            serde_json::json!(true),
            serde_json::json!(1.5),
            serde_json::json!(-1),
            serde_json::from_str("18446744073709551616").unwrap(),
        ]
    }

    #[test]
    fn envelope_u64_fields_reject_invalid_json_numbers() {
        for field in [
            "client_sequence",
            "global_sequence",
            "tab_id",
            "frame_id",
            "state_version",
        ] {
            for invalid_value in invalid_u64_values() {
                let mut event = fixtures()["valid_event"].clone();
                event[field] = invalid_value;
                assert!(
                    parse_desktop_message(event).is_err(),
                    "accepted invalid u64 field {field}"
                );
            }
        }
    }

    #[test]
    fn recording_state_event_count_uses_u64_rules() {
        for invalid_value in invalid_u64_values() {
            let mut state = fixtures()["valid_state"].clone();
            state["payload"]["event_count"] = invalid_value;
            assert!(
                parse_desktop_message(state).is_err(),
                "accepted invalid recording.state event_count"
            );
        }
    }

    #[test]
    fn identity_fields_are_required_non_empty_strings() {
        for field in ["browser_instance_id", "recording_session_id"] {
            let mut missing = fixtures()["valid_event"].clone();
            missing.as_object_mut().unwrap().remove(field);
            assert!(
                parse_desktop_message(missing).is_err(),
                "accepted missing identity field {field}"
            );

            for invalid_value in [serde_json::json!(""), serde_json::json!(7)] {
                let mut event = fixtures()["valid_event"].clone();
                event[field] = invalid_value;
                assert!(
                    parse_desktop_message(event).is_err(),
                    "accepted invalid identity field {field}"
                );
            }
        }
    }
}
