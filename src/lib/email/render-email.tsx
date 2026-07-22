import {
  Body,
  Button,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import type { CSSProperties, ReactNode } from "react";

type EmailBranding = {
  senderName?: string;
  supportEmail?: string | null;
};

export type EmailTemplateInput = {
  preheader: string;
  headline: string;
  body: string[];
  ctaLabel: string;
  ctaUrl: string;
  supportNote?: string;
  code?: string;
  branding?: EmailBranding;
};

const systemFont =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';

const appWordmark: CSSProperties = {
  margin: 0,
  color: "#242424",
  fontFamily: "Ruthie, cursive",
  fontSize: "26px",
  fontWeight: 300,
  lineHeight: 1,
};

function AppHead() {
  return (
    <Head>
      <Font
        fontFamily="Inter"
        fallbackFontFamily="Arial"
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2",
          format: "woff2",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Font
        fontFamily="Ruthie"
        fallbackFontFamily="cursive"
        webFont={{
          url: "https://fonts.gstatic.com/s/ruthie/v28/gokvH63sGkdqXuU9lA.ttf",
          format: "truetype",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
    </Head>
  );
}

function EmailParagraphs({
  body,
  style,
}: {
  body: string[];
  style: CSSProperties;
}) {
  return body.map((line, index) => (
    <Text
      key={`${index}-${line}`}
      style={{ ...style, marginTop: index === 0 ? 0 : "15px" }}
    >
      {line}
    </Text>
  ));
}

function OtpEmail({
  preheader,
  headline,
  body,
  ctaLabel,
  ctaUrl,
  supportNote,
  code,
}: EmailTemplateInput) {
  return (
    <Html lang="en" dir="ltr">
      <AppHead />
      <Body
        style={{
          backgroundColor: "#ffffff",
          fontFamily: systemFont,
          margin: 0,
        }}
      >
        <Preview>{preheader}</Preview>
        <Container
          style={{
            margin: "0 auto",
            maxWidth: "560px",
            padding: "20px 0 48px",
          }}
        >
          <Text className="font-cursive" style={appWordmark}>
            SleekSign
          </Text>
          <Heading
            style={{
              color: "#484848",
              fontFamily: systemFont,
              fontSize: "24px",
              fontWeight: 400,
              letterSpacing: "-0.5px",
              lineHeight: 1.3,
              margin: 0,
              padding: "17px 0 0",
            }}
          >
            {headline}
          </Heading>
          <Section style={{ padding: "27px 0" }}>
            <Button
              href={ctaUrl}
              style={{
                backgroundColor: "#18181b",
                borderRadius: "4px",
                boxSizing: "border-box",
                color: "#ffffff",
                display: "block",
                fontFamily: systemFont,
                fontSize: "15px",
                fontWeight: 600,
                lineHeight: "18px",
                padding: "11px 23px",
                textAlign: "center",
                textDecoration: "none",
                width: "100%",
              }}
            >
              {ctaLabel}
            </Button>
          </Section>
          <EmailParagraphs
            body={body}
            style={{
              color: "#3c4149",
              fontFamily: systemFont,
              fontSize: "15px",
              lineHeight: 1.4,
              margin: "0 0 15px",
            }}
          />
          {code ? (
            <code
              style={{
                backgroundColor: "#dfe1e4",
                borderRadius: "4px",
                color: "#3c4149",
                fontFamily:
                  "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
                fontSize: "21px",
                fontWeight: 700,
                letterSpacing: "-0.3px",
                padding: "1px 4px",
              }}
            >
              {code}
            </code>
          ) : null}
          {supportNote ? (
            <Text
              style={{
                color: "#71717a",
                fontSize: "15px",
                lineHeight: 1.4,
                margin: "15px 0 0",
              }}
            >
              {supportNote}
            </Text>
          ) : null}
          <Hr style={{ borderColor: "#dfe1e4", margin: "42px 0 26px" }} />
        </Container>
      </Body>
    </Html>
  );
}

function InvitationEmail({
  preheader,
  headline,
  body,
  ctaLabel,
  ctaUrl,
  supportNote,
}: EmailTemplateInput) {
  return (
    <Html lang="en" dir="ltr">
      <AppHead />
      <Body
        style={{
          backgroundColor: "#ffffff",
          color: "#24292e",
          fontFamily: systemFont,
          margin: 0,
        }}
      >
        <Preview>{preheader}</Preview>
        <Container
          style={{
            margin: "0 auto",
            maxWidth: "480px",
            padding: "20px 0 48px",
          }}
        >
          <Text className="font-cursive" style={appWordmark}>
            SleekSign
          </Text>
          <Text
            style={{
              fontSize: "24px",
              fontWeight: 600,
              lineHeight: 1.25,
              margin: "16px 0",
            }}
          >
            {headline}
          </Text>
          <Section
            style={{
              border: "1px solid #dedede",
              borderRadius: "5px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <EmailParagraphs
              body={body}
              style={{
                color: "#24292e",
                fontFamily: systemFont,
                fontSize: "14px",
                lineHeight: "24px",
                margin: "0 0 10px",
                textAlign: "left",
              }}
            />
            <Button
              href={ctaUrl}
              style={{
                backgroundColor: "#18181b",
                borderRadius: "8px",
                boxSizing: "border-box",
                color: "#ffffff",
                display: "block",
                fontFamily: systemFont,
                fontSize: "14px",
                fontWeight: 600,
                lineHeight: "20px",
                marginTop: "18px",
                padding: "12px 24px",
                textAlign: "center",
                textDecoration: "none",
                width: "100%",
              }}
            >
              {ctaLabel}
            </Button>
          </Section>
          {supportNote ? (
            <Text
              style={{
                color: "#6a737d",
                fontSize: "12px",
                lineHeight: "24px",
                margin: "24px 0 0",
                textAlign: "center",
              }}
            >
              {supportNote}
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

function WelcomeEmail({
  preheader,
  headline,
  body,
  ctaLabel,
  ctaUrl,
  supportNote,
}: EmailTemplateInput) {
  return (
    <Html lang="en" dir="ltr">
      <AppHead />
      <Body
        style={{
          backgroundColor: "#fbfcfb",
          color: "#103b05",
          fontFamily: "Inter,Arial,sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Preview>{preheader}</Preview>
        <Container
          style={{
            margin: "0 auto",
            maxWidth: "640px",
            padding: "64px 16px 24px",
          }}
        >
          <Section
            style={{
              borderRadius: "8px",
              boxShadow: "0 3px 7px rgba(193,195,193,0.1)",
            }}
          >
            <Section
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #d8e1d4",
                borderRadius: "8px",
              }}
            >
              <Section style={{ padding: "64px 40px 56px" }}>
                <Text
                  style={{
                    color: "#103b05",
                    fontFamily: "Arial,Helvetica,sans-serif",
                    fontSize: "48px",
                    letterSpacing: "-1.44px",
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {headline}
                </Text>
                <Section
                  align="left"
                  style={{
                    marginTop: "18px",
                    maxWidth: "480px",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  {body.map((line, index) => (
                    <Text
                      key={`${index}-${line}`}
                      style={{
                        color: "#194a07",
                        fontFamily: "Inter,Arial,sans-serif",
                        fontSize: "14px",
                        lineHeight: 1.5,
                        margin: index === 0 ? 0 : "18px 0 0",
                      }}
                    >
                      {line}
                    </Text>
                  ))}
                  <Text
                    style={{
                      color: "#194a07",
                      fontFamily: "Inter,Arial,sans-serif",
                      fontSize: "14px",
                      lineHeight: 1.5,
                      margin: "18px 0 0",
                    }}
                  >
                    <Link
                      href={ctaUrl}
                      style={{ color: "#103b05", textDecoration: "none" }}
                    >
                      {ctaLabel}
                    </Link>
                  </Text>
                </Section>
              </Section>
              <Section
                style={{
                  borderTop: "1px solid #d8e1d4",
                  padding: "64px 40px",
                }}
              >
                <Row style={{ width: "100%" }}>
                  <Column style={{ verticalAlign: "bottom", width: "70%" }}>
                    <Text
                      style={{
                        color: "#869c7f",
                        fontFamily: "Inter,Arial,sans-serif",
                        fontSize: "13px",
                        fontWeight: 300,
                        lineHeight: 1.5,
                        margin: 0,
                        maxWidth: "320px",
                      }}
                    >
                      {supportNote}
                    </Text>
                  </Column>
                  <Column
                    align="right"
                    style={{
                      paddingLeft: "24px",
                      verticalAlign: "bottom",
                      whiteSpace: "nowrap",
                      width: "30%",
                    }}
                  >
                    <Text
                      style={{
                        ...appWordmark,
                        color: "#103b05",
                        textAlign: "right",
                      }}
                    >
                      SleekSign
                    </Text>
                  </Column>
                </Row>
              </Section>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

async function renderEmail(component: ReactNode) {
  return render(component);
}

export function renderOtpEmailHtml(input: EmailTemplateInput) {
  return renderEmail(<OtpEmail {...input} />);
}

export function renderInvitationEmailHtml(input: EmailTemplateInput) {
  return renderEmail(<InvitationEmail {...input} />);
}

export function renderWelcomeEmailHtml(input: EmailTemplateInput) {
  return renderEmail(<WelcomeEmail {...input} />);
}
