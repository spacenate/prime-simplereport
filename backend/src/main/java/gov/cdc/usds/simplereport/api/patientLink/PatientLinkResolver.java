package gov.cdc.usds.simplereport.api.patientLink;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import gov.cdc.usds.simplereport.db.model.Person;
import gov.cdc.usds.simplereport.service.PatientLinkService;
import graphql.kickstart.tools.GraphQLQueryResolver;

@Component
public class PatientLinkResolver implements GraphQLQueryResolver {

    @Autowired
    private PatientLinkService pls;

    public Boolean getPatientLinkCurrent(String internalId) {
        return pls.getPatientLinkCurrent(internalId);
    }

    public Person getPatientLinkVerify(String internalId, String birthDate) throws Exception {
        return pls.getPatientLinkVerify(internalId, birthDate);
    }

}
